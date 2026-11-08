import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import {
    createAdminClient,
    createSessionClient,
    DATABASE_ID,
    COLLECTIONS,
} from "@/lib/appwrite-server";
import { computeAnalytics } from "@/lib/analytics/insights";
import type { DashboardAnalytics } from "@/types";
import { logger } from "@/lib/logger";

export async function GET() {
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

        const { databases } = await createAdminClient();
        const user = await account.get();

        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        const [invoicesResponse, clientsResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [
                Query.equal("userId", user.$id),
                Query.limit(5000),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.CLIENTS, [
                Query.equal("userId", user.$id),
                Query.limit(5000),
            ]),
        ]);

        const analytics = computeAnalytics(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            invoicesResponse.documents as unknown as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clientsResponse.documents as unknown as any,
        );

        return NextResponse.json(analytics);
    } catch (error) {
        logger.error("Error generating dashboard analytics:", error);

        const fallback: DashboardAnalytics = {
            forecast: {
                next30Days: 0,
                next90Days: 0,
                confidence: 0,
            },
            latePaymentRisk: [],
            customerSegments: [],
            anomalies: [],
            kpiInsights: [
                {
                    key: "analytics_unavailable",
                    value: "Analytics temporarily unavailable. Try again in a few moments.",
                    importance: "medium",
                },
            ],
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json(fallback, { status: 200 });
    }
}
