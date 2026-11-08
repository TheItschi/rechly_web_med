import { type Account, type Databases, type Storage, type Users, type Models, Query, Permission, Role } from "node-appwrite";
import { allDocuments } from "./pagination";

const database = "rechly-db";
const children: Record<string, [string, string]> = {
    invoices: ["invoice_items", "invoiceId"],
    offers: ["offer_items", "offerId"],
    recurring_invoices: ["recurring_invoice_items", "recurringInvoiceId"],
};
const collections = ["workspace_records", "invoices", "offers", "recurring_invoices", "dunning_notices", "expenses", "bank_transactions", "products", "clients", "user_company"];
type Backend = {
    databases: Databases;
    storage: Storage;
    users: Users;
    sessionFallback?: {
        account: Account;
        databases: Databases;
        storage: Storage;
    };
};
const errorType = (error: unknown) => (error as { type?: string })?.type;
const isScopeError = (error: unknown) =>
    ["general_unauthorized_scope", "user_unauthorized"].includes(errorType(error) || "");
const isMissingCollection = (error: unknown) =>
    ["collection_not_found", "table_not_found"].includes(errorType(error) || "");

async function deleteIfPresent(action: () => Promise<unknown>, fallback?: () => Promise<unknown>) {
    try {
        await action();
    } catch (error) {
        if (isScopeError(error) && fallback) {
            try {
                await fallback();
                return;
            } catch (fallbackError) {
                if (!["document_not_found", "storage_file_not_found", "user_unauthorized"].includes(errorType(fallbackError) || "")) {
                    throw fallbackError;
                }
                return;
            }
        }
        if (!["document_not_found", "storage_file_not_found"].includes(errorType(error) || "")) throw error;
    }
}

/** Never accepts a browser-supplied account ID. Caller must authenticate first.
 * Identity deletion is last: failed cleanup leaves the login available for retry.
 */
export async function eraseAccountData({ databases, storage, users, sessionFallback }: Backend, userId: string) {
    // Preflight authentication/key scope before any data deletion.
    try {
        await users.get(userId);
    } catch (error) {
        if (!isScopeError(error) || !sessionFallback) throw error;
    }

    type OwnedDocument = Models.Document & { userId: string; receiptFileId?: string };
    const records = new Map<string, OwnedDocument[]>();
    for (const collection of collections) {
        try {
            const listFn = async (q: string[]) => {
                try {
                    return await databases.listDocuments<OwnedDocument>(database, collection, q);
                } catch (err) {
                    if (isScopeError(err) && sessionFallback) {
                        return await sessionFallback.databases.listDocuments<OwnedDocument>(database, collection, q);
                    }
                    throw err;
                }
            };
            records.set(collection, await allDocuments(listFn, [Query.equal("userId", userId)]));
        } catch (error) {
            // Optional feature collections may not have been provisioned.
            if (!isMissingCollection(error) || ["clients", "invoices", "user_company", "products"].includes(collection)) throw error;
        }
    }

    // Include replaced/unattached uploads. Do not trust receiptFileId references with admin key:
    // a malformed reference must never delete another tenant's file.
    let filesListed = false;
    let files: Awaited<ReturnType<Storage["listFiles"]>>["files"] = [];
    try {
        files = await allDocuments(async q => ({ documents: (await storage.listFiles("receipts", q)).files }), []);
        filesListed = true;
    } catch (error) {
        if (errorType(error) !== "storage_bucket_not_found" && !(isScopeError(error) && sessionFallback)) {
            throw error;
        }
    }

    if (filesListed) {
        const ownerPermission = Permission.delete(Role.user(userId));
        for (const file of files.filter(file => file.$permissions.includes(ownerPermission))) {
            await deleteIfPresent(
                () => storage.deleteFile("receipts", file.$id),
                sessionFallback ? () => sessionFallback.storage.deleteFile("receipts", file.$id) : undefined,
            );
        }
    } else if (sessionFallback) {
        // Session client enforces user's own delete permission in Appwrite Storage
        for (const expense of records.get("expenses") || []) {
            if (expense.userId === userId && typeof expense.receiptFileId === "string" && expense.receiptFileId) {
                await deleteIfPresent(() => sessionFallback.storage.deleteFile("receipts", expense.receiptFileId!));
            }
        }
    }

    for (const [collection, documents] of records) {
        for (const document of documents) {
            if (document.userId !== userId) throw new Error("Account deletion ownership mismatch");
            const child = children[collection];
            if (child) {
                const listChildFn = async (q: string[]) => {
                    try {
                        return await databases.listDocuments(database, child[0], q);
                    } catch (err) {
                        if (isScopeError(err) && sessionFallback) {
                            return await sessionFallback.databases.listDocuments(database, child[0], q);
                        }
                        throw err;
                    }
                };
                const items = await allDocuments(listChildFn, [Query.equal(child[1], document.$id)]);
                for (const item of items) {
                    await deleteIfPresent(
                        () => databases.deleteDocument(database, child[0], item.$id),
                        sessionFallback ? () => sessionFallback.databases.deleteDocument(database, child[0], item.$id) : undefined,
                    );
                }
            }
            await deleteIfPresent(
                () => databases.deleteDocument(database, collection, document.$id),
                sessionFallback ? () => sessionFallback.databases.deleteDocument(database, collection, document.$id) : undefined,
            );
        }
    }

    // Appwrite Users.delete removes the actual identity and its preferences,
    // including saved AI credentials.
    try {
        await users.delete(userId);
    } catch (error) {
        if (isScopeError(error) && sessionFallback) {
            await sessionFallback.account.updatePrefs({});
            await sessionFallback.account.updateStatus();
            try {
                await sessionFallback.account.deleteSessions();
            } catch {
                // Session already invalidated by updateStatus
            }
            return;
        }
        throw error;
    }
}
