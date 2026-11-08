import { NextRequest, NextResponse } from "next/server";
import { Client, Users, Databases, Query } from "node-appwrite";
import { eraseGuestWorkspace } from "@/lib/workspace/repository";
import { eraseGuestTermine } from "@/lib/termine/store";
import { logger } from "@/lib/logger";
import {
    getAppwriteEndpoint,
    getAppwriteProjectId,
    getOptionalEnv,
} from "@/lib/env";

/**
 * Server-side cleanup for anonymous guest accounts
 *
 * This API route deletes anonymous users and their data after a timeout period.
 * Should be called periodically via cron job (e.g., every hour).
 *
 * Security: Protected by API secret key
 *
 * To set up:
 * 1. Create an API key in Appwrite Console with Users.read, Users.write permissions
 * 2. Add APPWRITE_API_KEY to your .env.local
 * 3. Add CLEANUP_API_SECRET to your .env.local (any random string)
 * 4. Set up a cron job to call this endpoint hourly with the secret
 *
 * Example cron call:
 * curl -X POST https://your-domain.com/api/cleanup-guests \
 *   -H "Authorization: Bearer YOUR_CLEANUP_API_SECRET"
 */

// Use environment variables from .env.local
const APPWRITE_ENDPOINT =
    getOptionalEnv("APPWRITE_API_ENDPOINT") || getAppwriteEndpoint();
const APPWRITE_PROJECT_ID =
    getOptionalEnv("APPWRITE_PROJECT_ID") || getAppwriteProjectId();

// Cleanup guests older than this (in milliseconds)
const GUEST_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

// Database and collection IDs (must match your app)
const DATABASE_ID = "rechly-db";
const COLLECTIONS = {
    USER_COMPANY: "user_company",
    CLIENTS: "clients",
    PRODUCTS: "products",
    INVOICES: "invoices",
    INVOICE_ITEMS: "invoice_items",
};

export async function POST(request: NextRequest) {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const expectedSecret = getOptionalEnv("CLEANUP_API_SECRET");

    if (!expectedSecret) {
        console.error("CLEANUP_API_SECRET not configured");
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 },
        );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = getOptionalEnv("APPWRITE_API_KEY");
    if (!apiKey) {
        console.error("APPWRITE_API_KEY not configured");
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 },
        );
    }

    try {
        // Initialize Appwrite server client
        const client = new Client()
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setKey(apiKey);

        const users = new Users(client);
        const databases = new Databases(client);

        // Calculate cutoff time
        const cutoffTime = new Date(Date.now() - GUEST_TIMEOUT_MS);

        // Get all users
        const userList = await users.list([
            Query.limit(100), // Process in batches
        ]);

        let deletedCount = 0;
        let dataDeletedCount = 0;
        const errors: string[] = [];

        for (const user of userList.users) {
            // Check if user is anonymous (no email) and old enough
            const isAnonymous = !user.email;
            const createdAt = new Date(user.$createdAt);
            const isExpired = createdAt < cutoffTime;

            if (isAnonymous && isExpired) {
                const userId = user.$id;
                logger.debug(`Cleaning up anonymous user: ${userId}`);

                try {
                    // The optional workspace/termine collections may be absent, but real cleanup failures
                    // must leave the guest identity available for a later retry.
                    dataDeletedCount += await eraseGuestWorkspace(databases, userId);
                    dataDeletedCount += await eraseGuestTermine(databases, userId);
                    // Delete user's data from all collections
                    for (const collectionId of Object.values(COLLECTIONS)) {
                        try {
                            const docs = await databases.listDocuments(
                                DATABASE_ID,
                                collectionId,
                                [
                                    Query.equal("userId", userId),
                                    Query.limit(100),
                                ],
                            );

                            for (const doc of docs.documents) {
                                await databases.deleteDocument(
                                    DATABASE_ID,
                                    collectionId,
                                    doc.$id,
                                );
                                dataDeletedCount++;
                            }
                        } catch {
                            // Collection might not exist or no documents found
                            logger.debug(
                                `No documents in ${collectionId} for user ${userId}`,
                            );
                        }
                    }

                    // Delete the user account
                    await users.delete(userId);
                    deletedCount++;
                    logger.debug(`✓ Deleted anonymous user: ${userId}`);
                } catch (deleteError) {
                    const errorMessage =
                        deleteError instanceof Error
                            ? deleteError.message
                            : "Unknown error";
                    errors.push(
                        `Failed to delete user ${userId}: ${errorMessage}`,
                    );
                    console.error(
                        `Failed to delete user ${userId}:`,
                        deleteError,
                    );
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cleanup completed`,
            stats: {
                usersDeleted: deletedCount,
                documentsDeleted: dataDeletedCount,
                errors: errors.length,
            },
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Cleanup failed:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Cleanup failed", details: errorMessage },
            { status: 500 },
        );
    }
}

// GET endpoint for health check
export async function GET() {
    return NextResponse.json({
        status: "ok",
        endpoint: "Guest cleanup service",
        timeout: `${GUEST_TIMEOUT_MS / (60 * 60 * 1000)} hours`,
    });
}
