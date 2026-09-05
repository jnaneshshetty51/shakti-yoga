import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get('token')?.value;
    const payload = token ? await verifyToken(token) : null;
    const isAdmin = payload?.role === 'admin';

    if (!isAdmin) {
        if (pathname.startsWith('/api/admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
