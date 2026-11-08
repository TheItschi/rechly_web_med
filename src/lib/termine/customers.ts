import { Query, Permission, Role, type Databases } from "node-appwrite";

// Mirrors COLLECTIONS/DATABASE_ID in src/lib/appwrite-server.ts (kept local so
// this module loads without server env, e.g. in unit tests).
const DATABASE_ID = "rechly-db";
const CLIENTS = "clients";

/**
 * Tenant-scoped customer match-or-create against Rechly's core `clients` table.
 * Never links across businesses: explicit `customerId` is verified for `userId`
 * ownership, email matching is `(userId, email)` only, and creation uses the
 * exact camelCase Appwrite `clients` schema.
 */
export async function findOrCreateCustomer(
    db: Databases,
    userId: string,
    input: { customerId?: string; name: string; email: string; phone?: string },
    transactionId?: string,
): Promise<{ id: string; created: boolean }> {
    if (input.customerId) {
        try {
            const explicit = await db.getDocument(
                DATABASE_ID,
                CLIENTS,
                input.customerId,
                [],
                transactionId,
            );
            if (explicit && explicit.userId === userId) {
                return { id: explicit.$id, created: false };
            }
        } catch {
            // Fall through to email match / create if customerId was stale or missing
        }
    }

    const email = input.email.trim().toLowerCase();
    const existing = await db
        .listDocuments(
            DATABASE_ID,
            CLIENTS,
            [
                Query.equal("userId", userId),
                Query.equal("email", email),
                Query.limit(1),
            ],
            transactionId,
        )
        .catch(() => ({ documents: [] as Array<{ $id: string; userId?: string }> }));

    const row = existing.documents[0];
    if (row && row.userId === userId) return { id: row.$id, created: false };

    const created = await db.createDocument(
        DATABASE_ID,
        CLIENTS,
        "unique()",
        {
            userId,
            clientType: "private",
            name: input.name.trim().slice(0, 200) || email,
            email,
            phone: input.phone?.trim().slice(0, 40) || null,
            addressLine1: "—",
            postalCode: "00000",
            city: "Unbekannt",
            country: "Deutschland",
            registrationDate: new Date().toISOString(),
            status: "active",
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
