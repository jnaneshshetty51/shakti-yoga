/**
 * Accept only a same-origin absolute path like "/dashboard/x?tab=1" — never
 * "//evil.com", "https://…", or a bare word. Used for post-auth redirects so a
 * crafted `?from=` can't bounce the user off-site.
 */
export function safeInternalPath(value: string | null | undefined): string | null {
    if (!value) return null;
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
    return value;
}

/** Read the post-auth destination from the current URL's `?from=` (or legacy `?redirect=`). */
export function redirectTargetFromLocation(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return safeInternalPath(params.get('from') ?? params.get('redirect'));
}
