import { NextRequest, NextResponse } from "next/server";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

// GET single product
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.PRODUCTS,
            id
        );

        if (doc.userId !== user.$id) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const product = {
            id: doc.$id,
            name: doc.name,
            description: doc.description ?? undefined,
            price: doc.price,
            tax_rate_percent: doc.taxRatePercent,
            unit_of_measure: doc.unitOfMeasure || "Stück",
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
        };

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { error: "Failed to fetch product" },
            { status: 500 }
        );
    }
}

// PUT update product
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const existing = await databases.getDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id);
        if (existing.userId !== user.$id) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const body = await request.json();

        // Update document
        const doc = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PRODUCTS,
            id,
            {
                name: body.name,
                description: body.description || null,
                price: body.price,
                taxRatePercent: body.tax_rate_percent,
                unitOfMeasure: body.unit_of_measure || "Stück",
            }
        );

        const product = {
            id: doc.$id,
            name: doc.name,
            description: doc.description ?? undefined,
            price: doc.price,
            tax_rate_percent: doc.taxRatePercent,
            unit_of_measure: doc.unitOfMeasure || "Stück",
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
        };

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json(
            { error: "Failed to update product" },
            { status: 500 }
        );
    }
}

// DELETE product
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        let account;
        try {
            const sessionClient = await createSessionClient();
            account = sessionClient.account;
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { databases } = await createAdminClient();

        // Get current user
        const user = await account.get();
        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const existing = await databases.getDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id);
        if (existing.userId !== user.$id) return NextResponse.json({ error: "Not found" }, { status: 404 });
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json(
            { error: "Failed to delete product" },
            { status: 500 }
        );
    }
}
