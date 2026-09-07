import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { countryForIp } from '@/lib/geoip';

const REGION_COOKIE = 'sy_region';
const REGION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

/** country ISO code → pricing region. Anything that isn't India is INTL. */
function regionFromCountry(country: string | null | undefined): 'IN' | 'INTL' {
    const c = (country || '').trim().toUpperCase();
    if (!c || c === 'IN' || c === 'IND' || c === 'INDIA' || c === 'INR') return 'IN';
    return 'INTL';
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isApi = pathname.startsWith('/api/');
    const needsAdmin = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
    const needsTeacher = pathname.startsWith('/teacher') || pathname.startsWith('/api/teacher');
    const needsMember = pathname.startsWith('/dashboard');
    const needsAuth = needsAdmin || needsTeacher || needsMember;

    // ---- Pricing region (every route) -------------------------------------
    // Precedence: ?region= override → existing cookie → GeoIP header → IN.
    const override = request.nextUrl.searchParams.get('region');
    let region = request.cookies.get(REGION_COOKIE)?.value;
    if (override === 'IN' || override === 'INTL') {
        region = override;
    } else if (override) {
        region = regionFromCountry(override);
    }
    if (region !== 'IN' && region !== 'INTL') {
        const country =
            request.headers.get('x-geo-country') ||       // nginx GeoIP2, if configured
            request.headers.get('x-vercel-ip-country') ||
            request.headers.get('cf-ipcountry') ||
            (await countryForIp(
                request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip'),
            ));
        region = regionFromCountry(country);
    }

    // Make the resolved region visible to server components on THIS request
    // (the cookie only takes effect on the next one).
    const forwarded = new Headers(request.headers);
    forwarded.set('x-sy-region', region);

    const finish = (res: NextResponse) => {
        res.cookies.set(REGION_COOKIE, region!, {
            maxAge: REGION_MAX_AGE,
            path: '/',
            sameSite: 'lax',
        });
        return res;
    };

    // ---- Auth gate (protected routes only) -------------------------------
    if (!needsAuth) {
        return finish(NextResponse.next({ request: { headers: forwarded } }));
    }

    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = bearer || request.cookies.get('token')?.value;
    const payload = token ? await verifyToken(token) : null;

    if (!payload) {
        if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname + request.nextUrl.search);
        return finish(NextResponse.redirect(loginUrl));
    }

    const role = payload.role;
    const home = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/dashboard';

    if (needsAdmin && role !== 'admin') {
        if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return finish(NextResponse.redirect(new URL(home, request.url)));
    }
    if (needsTeacher && role !== 'teacher' && role !== 'admin') {
        if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return finish(NextResponse.redirect(new URL(home, request.url)));
    }
    if (needsMember && role === 'teacher') {
        return finish(NextResponse.redirect(new URL('/teacher', request.url)));
    }

    return finish(NextResponse.next({ request: { headers: forwarded } }));
}

// Node runtime so the GeoIP lookup (maxmind + a local .mmdb) can read the file.
export const runtime = 'nodejs';

export const config = {
    // Everything except Next internals and static files (so the region cookie
    // is set on the first marketing pageview).
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|woff2?)$).*)'],
};
