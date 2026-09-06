import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isApi = pathname.startsWith('/api/');
    const needsAdmin = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

    const token = request.cookies.get('token')?.value;
    const payload = token ? await verifyToken(token) : null;

    // Not signed in — bounce to /login (or 401 for API calls).
    if (!payload) {
        if (isApi) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    // Signed in but not an admin, on an admin-only route.
    if (needsAdmin && payload.role !== 'admin') {
        if (isApi) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*', '/dashboard/:path*'],
};
