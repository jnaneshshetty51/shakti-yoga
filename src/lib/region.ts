import { cookies, headers } from 'next/headers';
import { regionFor, type Region } from '@/lib/pricing';

/**
 * Server-side pricing region. Precedence:
 *   1. explicit hint (a `?region=` param, or a stored preference passed in)
 *   2. the `sy_region` cookie (set by middleware from GeoIP, or by the ₹/$ toggle)
 *   3. the `x-geo-country` header (nginx GeoIP2, this request only)
 *   4. default → IN
 */
export const REGION_COOKIE = 'sy_region';

export async function resolveRegion(explicit?: string | null): Promise<Region> {
    if (explicit) return regionFor(explicit);

    const jar = await cookies();
    const fromCookie = jar.get(REGION_COOKIE)?.value;
    if (fromCookie === 'IN' || fromCookie === 'INTL') return fromCookie;

    const h = await headers();
    const country =
        h.get('x-sy-region') === 'INTL' ? 'INTL'
        : h.get('x-sy-region') === 'IN' ? 'IN'
        : h.get('x-geo-country') || h.get('x-vercel-ip-country') || '';
    return regionFor(country);
}

/** The other currency, for a "prices shown in X — switch to Y" affordance. */
export function otherRegion(r: Region): Region {
    return r === 'IN' ? 'INTL' : 'IN';
}
