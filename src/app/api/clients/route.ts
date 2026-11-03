import { allDocuments } from "@/lib/server/pagination";
import { eInvoiceWrite, readEInvoiceData, IdentifierValidationError } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { Query, Permission, Role } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

// GET all clients
export async function GET() {
    try {
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

        // Get clients filtered by userId
        const documents = await allDocuments(q => databases.listDocuments(DATABASE_ID, COLLECTIONS.CLIENTS, q), [Query.equal("userId", user.$id)]);

        // Map documents to client format
        const clients = documents.map((doc) => ({
            id: doc.$id,
            e_invoice: readEInvoiceData(doc.eInvoiceData),
            client_type: doc.clientType || "company",
            name: doc.name,
            contact_person: doc.contactPerson ?? undefined,
            address_line1: doc.addressLine1,
            address_line2: doc.addressLine2 ?? undefined,
            postal_code: doc.postalCode,
            city: doc.city,
            country: doc.country || "Deutschland",
            email: doc.email ?? undefined,
            phone: doc.phone ?? undefined,
            vat_id: doc.vatId ?? undefined,
            tax_number: doc.taxNumber ?? undefined,
            leitweg_id: doc.leitwegId ?? undefined,
            registration_date: doc.registrationDate ?? undefined,
            status: doc.status || "active",
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
        }));

        // Keep the existing newest-first presentation after stable cursor traversal.
        clients.sort((a, b) => b.created_at - a.created_at);
        return NextResponse.json(clients);
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error fetching clients:", error);
        return NextResponse.json(
            { error: "Failed to fetch clients" },
            { status: 500 }
        );
    }
}

// POST create new client
export async function POST(request: NextRequest) {
    try {
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

        const body = await request.json();
        const { ID } = await import("node-appwrite");

        // Build document data
        const documentData: Record<string, unknown> = {
            userId: user.$id,
            ...eInvoiceWrite(body.e_invoice),
            ...eInvoiceWrite(body.e_invoice),
                clientType: body.client_type || "company",
            name: body.name,
            contactPerson: body.contact_person || null,
            addressLine1: body.address_line1,
            addressLine2: body.address_line2 || null,
            postalCode: body.postal_code,
            city: body.city,
            country: body.country || "Deutschland",
            email: body.email || null,
            phone: body.phone || null,
            vatId: body.vat_id || null,
            taxNumber: body.tax_number || null,
            leitwegId: body.leitweg_id || null,
            registrationDate: body.registration_date || new Date().toISOString(),
            status: body.status || "active",
        };

        const doc = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.CLIENTS,
            ID.unique(),
            documentData,
            [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]
        );

        const client = {
            id: doc.$id,
            e_invoice: readEInvoiceData(doc.eInvoiceData),
            client_type: doc.clientType || "company",
            name: doc.name,
            contact_person: doc.contactPerson ?? undefined,
            address_line1: doc.addressLine1,
            address_line2: doc.addressLine2 ?? undefined,
            postal_code: doc.postalCode,
            city: doc.city,
            country: doc.country || "Deutschland",
            email: doc.email ?? undefined,
            phone: doc.phone ?? undefined,
            vat_id: doc.vatId ?? undefined,
            tax_number: doc.taxNumber ?? undefined,
            leitweg_id: doc.leitwegId ?? undefined,
            registration_date: doc.registrationDate ?? undefined,
            status: doc.status || "active",
            created_at: new Date(doc.$createdAt).getTime(),
            updated_at: new Date(doc.$updatedAt).getTime(),
        };

        return NextResponse.json(client);
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error creating client:", error);
        const appwriteError = error as {
            code?: number;
            type?: string;
            message?: string;
            response?: { message?: string };
        };
        let userMessage = "Fehler beim Speichern des Patienten";
        let statusCode = 500;
        if (appwriteError.code === 401 || appwriteError.code === 403) {
            userMessage = "Sitzung abgelaufen – bitte erneut anmelden";
            statusCode = 401;
        } else if (appwriteError.code === 400) {
            userMessage = appwriteError.response?.message || appwriteError.message || "Ungültige Daten – bitte alle Pflichtfelder prüfen";
            statusCode = 400;
        } else if (appwriteError.message) {
            userMessage = appwriteError.message;
        }
        return NextResponse.json(
            { error: userMessage, details: appwriteError.message || "Unknown error", code: appwriteError.code },
            { status: statusCode }
        );
    }
}
