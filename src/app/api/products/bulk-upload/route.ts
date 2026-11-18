import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { ID, Permission, Role } from "node-appwrite";
import {
    COLLECTIONS,
    createAdminClient,
    createSessionClient,
    DATABASE_ID,
} from "@/lib/appwrite-server";

const MAX_CSV_BYTES = 10 * 1024 * 1024;
const BATCH_SIZE = 50;
const MAX_ERRORS = 100;
const DEFAULT_UNIT = "Stück";
const ALLOWED_UNITS = new Set([
    "Stück",
    "Stunde",
    "Tag",
    "Monat",
    "Pauschal",
    "kg",
    "m",
    "m²",
    "Liter",
]);

type ProductInsertPayload = {
    row: number;
    data: {
        userId: string;
        name: string;
        description: string | null;
        price: number;
        taxRatePercent: number;
        unitOfMeasure: string;
    };
};

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(/,/g, ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
}

function normalizeUnit(rawValue: string): string {
    const value = rawValue.trim();
    if (!value) return DEFAULT_UNIT;

    const lower = value.toLowerCase();
    const aliasMap: Record<string, string> = {
        stueck: "Stück",
        stück: "Stück",
        piece: "Stück",
        pieces: "Stück",
        hour: "Stunde",
        hours: "Stunde",
        std: "Stunde",
        day: "Tag",
        days: "Tag",
        month: "Monat",
        months: "Monat",
        flat: "Pauschal",
        flatrate: "Pauschal",
        liter: "Liter",
        litre: "Liter",
        meter: "m",
        metre: "m",
        sqm: "m²",
        m2: "m²",
    };

    const mapped = aliasMap[lower] || value;
    return ALLOWED_UNITS.has(mapped) ? mapped : DEFAULT_UNIT;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
    ) {
        return (error as { message: string }).message;
    }
    return "failed to insert row";
}

function normalizeCell(row: Record<string, unknown>, key: string): string {
    const lowerMap = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]),
    );
    const value = lowerMap[key.toLowerCase()] ?? "";
    return String(value ?? "").trim();
}

function validateRow(
    csvRow: Record<string, unknown>,
    rowNumber: number,
    userId: string,
):
    | { valid: true; value: ProductInsertPayload }
    | { valid: false; error: string } {
    const name = normalizeCell(csvRow, "name");
    const description = normalizeCell(csvRow, "description");
    const priceRaw = normalizeCell(csvRow, "price");
    const taxRaw = normalizeCell(csvRow, "tax_rate_percent");
    const unit = normalizeUnit(normalizeCell(csvRow, "unit_of_measure"));

    if (!name) {
        return { valid: false, error: "name is required" };
    }

    const price = parseNumber(priceRaw);
    if (price === null || price < 0) {
        return { valid: false, error: "price must be a non-negative number" };
    }

    const taxRatePercent = parseNumber(taxRaw);
    if (taxRatePercent === null || taxRatePercent < 0 || taxRatePercent > 100) {
        return {
            valid: false,
            error: "tax_rate_percent must be between 0 and 100",
        };
    }

    return {
        valid: true,
        value: {
            row: rowNumber,
            data: {
                userId,
                name,
                description: description || null,
                price,
                taxRatePercent,
                unitOfMeasure: unit,
            },
        },
    };
}

export async function POST(request: NextRequest) {
    try {
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "CSV file is required" },
                { status: 400 },
            );
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            return NextResponse.json(
                { error: "Only .csv files are supported" },
                { status: 400 },
            );
        }

        if (file.size > MAX_CSV_BYTES) {
            return NextResponse.json(
                { error: "CSV file too large (max 10 MB)" },
                { status: 413 },
            );
        }

        const { databases } = await createAdminClient();

        const errors: Array<{ row: number; message: string }> = [];
        let processedRows = 0;
        let insertedRows = 0;
        const batch: ProductInsertPayload[] = [];

        const flushBatch = async () => {
            if (batch.length === 0) return;
            const current = batch.splice(0, batch.length);

            const results = await Promise.allSettled(
                current.map(async ({ row, data }) => {
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.PRODUCTS,
                        ID.unique(),
                        data,
                        [
                            Permission.read(Role.user(user.$id)),
                            Permission.update(Role.user(user.$id)),
                            Permission.delete(Role.user(user.$id)),
                        ],
                    );
                    return row;
                }),
            );

            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    insertedRows += 1;
                } else if (errors.length < MAX_ERRORS) {
                    errors.push({
                        row: current[index].row,
                        message: getErrorMessage(result.reason),
                    });
                }
            });
        };

        const stream = Readable.fromWeb(
            file.stream() as unknown as import("stream/web").ReadableStream,
        );
        const parser = stream.pipe(
            parse({
                columns: true,
                bom: true,
                trim: true,
                skip_empty_lines: true,
                relax_column_count: true,
            }),
        );

        let rowNumber = 1;
        for await (const csvRow of parser as AsyncIterable<
            Record<string, unknown>
        >) {
            rowNumber += 1;
            processedRows += 1;

            const validated = validateRow(csvRow, rowNumber, user.$id);
            if (!validated.valid) {
                if (errors.length < MAX_ERRORS) {
                    errors.push({ row: rowNumber, message: validated.error });
                }
                continue;
            }

            batch.push(validated.value);
            if (batch.length >= BATCH_SIZE) {
                await flushBatch();
            }
        }

        await flushBatch();

        return NextResponse.json({
            processedRows,
            insertedRows,
            failedRows: errors.length,
            errors,
        });
    } catch (error) {
        console.error("Error during product CSV bulk upload:", error);
        return NextResponse.json(
            { error: "Bulk upload failed" },
            { status: 500 },
        );
    }
}
