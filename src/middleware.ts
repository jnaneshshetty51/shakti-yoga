import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { verifyToken } from '@/lib/jwt';
import { signToken, sessionClaims, SESSION_MAX_AGE } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
    const needsAdmin = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin');
    const needsTeacher = pathname === '/teacher' || pathname.startsWith('/teacher/') || pathname.startsWith('/api/teacher');
    const needsMember = pathname.startsWith('/dashboard');
    const needsAuth = needsAdmin || needsTeacher || needsMember;

    // ---- Mobile → web session handoff (?handoff=) -------------------------
    // Exchanges a one-time token (minted by /api/auth/web-handoff for a
    // bearer-token mobile session) for a real cookie session, then redirects
    // to the same path with the token stripped. Lets "Change plan" open the
    // web checkout from the app without forcing a second login.
    const handoffToken = request.nextUrl.searchParams.get('handoff');
    if (handoffToken) {
        const clean = new URL(pathname + request.nextUrl.search, request.url);
        clean.searchParams.delete('handoff');

        const tokenHash = createHash('sha256').update(handoffToken).digest('hex');
        const row = await prisma.webHandoffToken.findUnique({ where: { tokenHash } });
        if (row && !row.usedAt && row.expiresAt.getTime() > Date.now()) {
            const user = await prisma.user.findUnique({ where: { id: row.userId } });
            if (user) {
                await prisma.webHandoffToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
                const jwt = await signToken(sessionClaims(user));
                const res = NextResponse.redirect(clean);
                res.cookies.set('token', jwt, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: SESSION_MAX_AGE,
                    path: '/',
                });
                return res;
            }
        }
        // Invalid/expired/already-used — fall through as a plain anonymous
        // request to the clean URL rather than surfacing a dead token.
        return NextResponse.redirect(clean);
    }

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
    matcher: ['/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|woff2?)$).*)'],
};
