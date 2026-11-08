/**
 * Shared client-side API helper.
 * Single place for JSON handling + error extraction so services
 * and stores don't re-implement fetch() boilerplate.
 */

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

interface ApiOptions extends RequestInit {
    /** Return null instead of throwing on 404 */
    allow404?: boolean;
}

async function parseError(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        if (data && typeof data.error === "string" && data.error) {
            return data.error;
        }
    } catch {
        // non-JSON error body — fall through to status text
    }
    return res.statusText || fallback;
}

export async function apiFetch<T>(
    path: string,
    options: ApiOptions = {},
    fallbackError = "Request failed",
): Promise<T> {
    const { allow404, ...init } = options;
    const res = await fetch(path, {
        ...init,
        headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...(init.headers ?? {}),
        },
    });

    if (res.status === 404 && allow404) {
        return null as T;
    }

    if (!res.ok) {
        throw new ApiError(await parseError(res, fallbackError), res.status);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return (await res.json()) as T;
}

export const apiGet = <T>(path: string, fallback?: string) =>
    apiFetch<T>(path, {}, fallback ?? `GET ${path} failed`);

export const apiPost = <T>(path: string, body?: unknown, fallback?: string) =>
    apiFetch<T>(
        path,
        { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) },
        fallback ?? `POST ${path} failed`,
    );

export const apiPut = <T>(path: string, body?: unknown, fallback?: string) =>
    apiFetch<T>(
        path,
        { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) },
        fallback ?? `PUT ${path} failed`,
    );

export const apiDelete = (path: string, fallback?: string) =>
    apiFetch<void>(path, { method: "DELETE" }, fallback ?? `DELETE ${path} failed`);
