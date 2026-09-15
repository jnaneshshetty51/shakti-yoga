/**
 * First-touch marketing attribution, captured once by middleware.ts into the
 * `sy_campaign` cookie (or the `x-sy-campaign` header on the very first
 * request, before the cookie round-trips). Read this wherever a Lead gets
 * created from a public form so `Lead.campaign` reflects where the person
 * actually came from, not just a hand-typed guess.
 */
export function getCampaignFromRequest(request: Request): string | null {
    const header = request.headers.get('x-sy-campaign');
    if (header) return header;

    const cookieHeader = request.headers.get('cookie') ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)sy_campaign=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}
