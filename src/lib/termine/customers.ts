import { Query } from "node-appwrite";
import { Permission, Role } from "node-appwrite";
import type { Databases } from "node-appwrite";

// Mirrors COLLECTIONS/DATABASE_ID in src/lib/appwrite-server.ts (kept local so
// this module loads without server env, e.g. in unit tests).
const DATABASE_ID = "rechly-db";
const CLIENTS = "clients";

/**
 * Tenant-scoped customer match-or-create. Never links across businesses:
 * matching is (userId, email) only, and creation writes the owner's userId.
 */
export async function findOrCreateCustomer(
    db: Databases,
    userId: string,
    input: { name: string; email: string; phone?: string },
    transactionId?: string,
): Promise<{ id: string; created: boolean }> {
    const email = input.email.trim().toLowerCase();
    const existing = await db.listDocuments(DATABASE_ID, CLIENTS, [
        Query.equal("userId", userId),
        Query.equal("email", email),
        Query.limit(1),
    ]);
    const row = existing.documents[0];
    if (row && row.userId === userId) return { id: row.$id, created: false };
    const created = await db.createDocument(
        DATABASE_ID,
        CLIENTS,
        "unique()",
        {
            userId,
            name: input.name.trim().slice(0, 200) || email,
            email,
            phone: input.phone?.trim().slice(0, 40) || null,
            address_line1: "",
            postal_code: "",
            city: "",
            country: "Deutschland",
        },
        [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
        ],
        transactionId,
    );
    return { id: created.$id, created: true };
}
