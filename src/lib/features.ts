/**
 * Platform module flags.
 * Integrated modules are enabled by default as part of the unified Rechly platform,
 * and can be explicitly disabled via `=0` (e.g. kill-switch in deployment env).
 */
export function isWorkspaceEnabled(): boolean {
    return process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "0";
}

export function isTermineEnabled(): boolean {
    return process.env.NEXT_PUBLIC_RECHLY_TERMINE_ENABLED !== "0";
}
