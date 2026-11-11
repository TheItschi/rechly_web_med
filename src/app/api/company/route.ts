import { IdentifierValidationError } from "@/lib/eRechnung/identifiers";
import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import {
    createSessionClient,
    createAdminClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";

import { companyRead, saveCompanySettings, companyFailure } from "@/lib/server/companySettings";

// GET company info
export async function GET() {
    try {
        let user;
        try {
            const sessionClient = await createSessionClient();
            user = await sessionClient.account.get();
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { databases } = await createAdminClient();
        // Get company info for this user
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.COMPANY_INFO,
            [Query.equal("userId", user.$id), Query.limit(1)]
        );

        if (response.documents.length === 0) {
            return NextResponse.json(null);
        }

        return NextResponse.json(companyRead(response.documents[0]));
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("Error fetching company:", error);
        return NextResponse.json(
            { error: "Failed to fetch company" },
            { status: 500 }
        );
    }
}

// POST create or update company info
export async function POST(request: NextRequest) {
    try {
        let user;
        try {
            const sessionClient = await createSessionClient();
            user = await sessionClient.account.get();
        } catch {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { databases } = await createAdminClient();
        let body: unknown;
        try { body = await request.json(); }
        catch { return NextResponse.json({ error: "Die Firmendaten haben ein ungültiges Format." }, { status: 400 }); }
        return NextResponse.json(await saveCompanySettings(databases, user.$id, body));
    } catch (error) {
        if (error instanceof IdentifierValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
        const failure = companyFailure(error);
        // Keep diagnostics useful without logging company details, logos or credentials.
        const backend = error as { code?: number; type?: string };
        console.error("Error saving company:", { code: backend?.code, type: backend?.type, field: failure.field, status: failure.status });
        return NextResponse.json({ error: failure.message, field: failure.field }, { status: failure.status });
    }
}
