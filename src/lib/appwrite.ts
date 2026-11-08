import {
    Client,
    Account,
    Databases,
    ID,
    OAuthProvider,
    Permission,
    Role,
} from "appwrite";
import { getAppwriteEndpoint, getAppwriteProjectId } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Appwrite Cloud Configuration
 * Uses environment variables from .env.local
 * Same backend as mobile app for seamless sync
 */
const APPWRITE_ENDPOINT = getAppwriteEndpoint();
const APPWRITE_PROJECT_ID = getAppwriteProjectId();

/**
 * Initialize Appwrite Client for Browser
 */
const client = new Client();

client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

/**
 * Service Instances
 */
export const account = new Account(client);
export const databases = new Databases(client);

/**
 * Get current user ID - returns null if not authenticated
 */
export const getCurrentUserId = async (): Promise<string | null> => {
    try {
        const user = await account.get();
        return user.$id;
    } catch {
        return null;
    }
};

/**
 * Get document permissions for current user
 * Restricts read/write to the creating user
 */
export const getUserPermissions = (userId: string): string[] => {
    return [
        Permission.read(Role.user(userId)),
        Permission.write(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
    ];
};

/**
 * Database and Collection IDs - Must match mobile app
 */
export const DATABASE_ID = "rechly-db";

export const COLLECTIONS = {
    USER_COMPANY: "user_company",
    CLIENTS: "clients",
    PRODUCTS: "products",
    INVOICES: "invoices",
    INVOICE_ITEMS: "invoice_items",
    OFFERS: "offers",
    OFFER_ITEMS: "offer_items",
    RECURRING_INVOICES: "recurring_invoices",
    RECURRING_INVOICE_ITEMS: "recurring_invoice_items",
    EXPENSES: "expenses",
    BANK_TRANSACTIONS: "bank_transactions",
} as const;

export const STORAGE = {
    RECEIPTS: "receipts",
} as const;

/**
 * Helper: Generate unique document ID
 */
export const generateId = () => ID.unique();

/**
 * Helper: Check if Appwrite is configured
 */
export const isAppwriteConfigured = (): boolean => {
    return !!(APPWRITE_PROJECT_ID && APPWRITE_ENDPOINT);
};

/**
 * Authentication: Get current user session
 * Returns null if not authenticated
 */
export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch {
        logger.debug("No active session");
        return null;
    }
};

/**
 * Authentication: Register with email/password
 */
export const registerWithEmail = async (
    email: string,
    password: string,
    name: string,
) => {
    try {
        const user = await account.create(ID.unique(), email, password, name);
        logger.debug("User registered:", user.$id);
        // Auto-login after registration
        await loginWithEmail(email, password);
        return user;
    } catch (error) {
        console.error("Registration failed:", error);
        throw error;
    }
};

/**
 * Authentication: Login with email/password
 */
export const loginWithEmail = async (email: string, password: string) => {
    try {
        const session = await account.createEmailPasswordSession(
            email,
            password,
        );
        logger.debug("Logged in:", session.userId);
        return session;
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
};

/**
 * Authentication: Create anonymous session
 */
export const createAnonymousSession = async () => {
    try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
            logger.debug("Already authenticated:", currentUser.$id);
            return currentUser;
        }

        logger.debug("Creating anonymous session...");
        const session = await account.createAnonymousSession();
        logger.debug("Anonymous session created:", session.userId);
        return session;
    } catch (error) {
        console.error("Failed to create anonymous session:", error);
        throw error;
    }
};

/**
 * Authentication: Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const user = await account.get();
        return !!user;
    } catch {
        return false;
    }
};

/**
 * Authentication: Logout
 */
export const logout = async () => {
    try {
        await account.deleteSession("current");
        logger.debug("Logged out");
    } catch (error) {
        console.error("Logout error:", error);
    }
};

/**
 * Authentication: Delete user account
 * The server authenticates the current identity and performs ordered cleanup.
 */
export const deleteAccount = async (): Promise<"deleted"> => {
    const headers: Record<string, string> = { "x-rechly-confirm-delete": "delete-account" };
    const send = () => fetch("/api/auth/account", { method: "DELETE", headers });
    let response = await send();
    // Support older browser-SDK sessions and anonymous accounts without an SSR cookie.
    if (response.status === 401) {
        try {
            const { jwt } = await account.createJWT();
            headers.Authorization = `Bearer ${jwt}`;
            response = await send();
        } catch {
            // Keep original 401 response
        }
    }
    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw Object.assign(new Error("Account deletion failed"), { code: result.code || "DELETION_FAILED" });
    }
    const result = await response.json();
    if (result.status !== "deleted") throw new Error("Invalid deletion response");
    try {
        await account.deleteSession("current");
    } catch {
        // Session already invalidated on server
    }
    return "deleted";
};

/**
 * Authentication: Login with Google OAuth
 * Redirects to /auth/callback which checks if onboarding is needed
 */
export const loginWithGoogle = () => {
    const successUrl = `${window.location.origin}/auth/callback`;
    const failureUrl = `${window.location.origin}/login`;

    account.createOAuth2Session(
        "google" as OAuthProvider,
        successUrl,
        failureUrl,
    );
};
