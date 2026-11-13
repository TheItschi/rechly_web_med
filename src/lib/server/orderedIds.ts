import { ID } from "node-appwrite";

/**
 * Document ids for line items that sort in creation order. ID.unique() is
 * only millisecond-ordered (random suffix), so items created within the same
 * millisecond could come back shuffled when listed by id (desktop/SQLite
 * mode). A shared base plus a zero-padded index keeps the original order.
 */
export function orderedIds(): () => string {
    const base = ID.unique();
    let index = 0;
    return () => `${base}${String(index++).padStart(4, "0")}`;
}
