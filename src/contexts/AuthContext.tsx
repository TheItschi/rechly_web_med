"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Models } from "appwrite";
import {
    getCurrentUser,
    logout as appwriteLogout,
    loginWithGoogle,
    createAnonymousSession,
    deleteAccount as appwriteDeleteAccount,
} from "@/lib/appwrite";
import { clearAllCaches } from "@/store";
import { isDesktopRuntime } from "@/lib/runtime";

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    isAnonymous: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<"deleted">;
    loginAnonymously: () => Promise<void>;
    googleLogin: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [isAnonymous, setIsAnonymous] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    // Auto-logout anonymous users when tab closes
    useEffect(() => {
        if (!isAnonymous || !user) return;

        const handleBeforeUnload = async () => {
            // Mark session for cleanup
            sessionStorage.setItem("guestSession", "true");
        };

        const handleVisibilityChange = async () => {
            if (document.visibilityState === "hidden" && isAnonymous) {
                // Store timestamp when tab becomes hidden
                sessionStorage.setItem("guestHiddenAt", Date.now().toString());
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [isAnonymous, user]);

    // Check if returning from a closed tab (guest session should be cleared)
    useEffect(() => {
        const wasGuest = sessionStorage.getItem("guestSession");
        if (wasGuest && isAnonymous) {
            // Clear guest session on page load if it was a guest
            sessionStorage.removeItem("guestSession");
            sessionStorage.removeItem("guestHiddenAt");
            logout();
        }
    }, [isAnonymous]);

    const checkAuth = async () => {
        try {
            // Use SSR session check via API route (avoids client-side Appwrite 401)
            const response = await fetch("/api/auth/user");
            if (response.ok) {
                const currentUser = await response.json();
                if (currentUser) {
                    setUser(currentUser);
                    setIsAnonymous(!currentUser.email);
                } else {
                    setUser(null);
                    setIsAnonymous(false);
                }
            } else {
                setUser(null);
                setIsAnonymous(false);
            }
        } catch {
            setUser(null);
            setIsAnonymous(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            // Clear cached data from previous session
            clearAllCaches();

            // Use SSR login API to set HTTP-only session cookie
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Login failed");
            }

            // Fetch user from SSR session
            const userResponse = await fetch("/api/auth/user");
            if (userResponse.ok) {
                const currentUser = await userResponse.json();
                setUser(currentUser);
            }
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, password: string, name: string) => {
        setLoading(true);
        try {
            // Use SSR register API to set HTTP-only session cookie
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Registration failed");
            }

            // Fetch user from SSR session
            const userResponse = await fetch("/api/auth/user");
            if (userResponse.ok) {
                const currentUser = await userResponse.json();
                setUser(currentUser);
            }
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            // Logout from client-side Appwrite
            if (!isDesktopRuntime) {
                await appwriteLogout();
            }

            // Also clear SSR session cookie
            try {
                await fetch("/api/auth/logout", { method: "POST" });
            } catch {
                // Ignore SSR logout errors
            }

            setUser(null);
            setIsAnonymous(false);
            sessionStorage.removeItem("guestSession");
            sessionStorage.removeItem("guestHiddenAt");
            // Clear all cached data
            clearAllCaches();
        } finally {
            setLoading(false);
        }
    };

    const deleteAccount = async () => {
        if (isDesktopRuntime) {
            throw new Error(
                "Local profile deletion is not available in this desktop preview",
            );
        }
        const result = await appwriteDeleteAccount();
        setUser(null);
        setIsAnonymous(false);
        sessionStorage.removeItem("guestSession");
        sessionStorage.removeItem("guestHiddenAt");
        clearAllCaches();
        return result;
    };

    const loginAnonymously = async () => {
        setLoading(true);
        try {
            // Clear cached data from previous session
            clearAllCaches();

            let currentUser;
            if (isDesktopRuntime) {
                const response = await fetch("/api/auth/user");
                if (!response.ok) throw new Error("Local profile is unavailable");
                currentUser = await response.json();
            } else {
                await createAnonymousSession();
                currentUser = await getCurrentUser();
            }
            setUser(currentUser);
            setIsAnonymous(true);
            sessionStorage.setItem("guestSession", "true");
        } finally {
            setLoading(false);
        }
    };

    const refreshUser = async () => {
        await checkAuth();
    };

    const googleLogin = () => {
        if (isDesktopRuntime) return;
        loginWithGoogle();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAnonymous,
                login,
                register,
                logout,
                deleteAccount,
                loginAnonymously,
                googleLogin,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
