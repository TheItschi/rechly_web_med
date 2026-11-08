"use client";

/** Typed fetch helpers for the dashboard Termine API. */
export async function termineApi<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Anfrage fehlgeschlagen.");
    return data as T;
}

export const get = <T,>(path: string) => termineApi<T>(path);
export const post = <T,>(path: string, body: unknown) =>
    termineApi<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
export const patch = <T,>(path: string, body: unknown) =>
    termineApi<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = <T,>(path: string) => termineApi<T>(path, { method: "DELETE" });
