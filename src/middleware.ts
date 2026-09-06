import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isApi = pathname.startsWith('/api/');
    const needsAdmin = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
    const needsTeacher = pathname.startsWith('/teacher') || pathname.startsWith('/api/teacher');

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

    const role = payload.role;
    const home = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/dashboard';

    // Admin-only route, caller isn't an admin.
    if (needsAdmin && role !== 'admin') {
        if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.redirect(new URL(home, request.url));
    }

    // Teacher route — teachers and admins (preview) only.
    if (needsTeacher && role !== 'teacher' && role !== 'admin') {
        if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.redirect(new URL(home, request.url));
    }

    // Teachers have their own home — keep them out of the member dashboard.
    if (pathname.startsWith('/dashboard') && role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/admin/:path*',
        '/teacher/:path*',
        '/api/teacher/:path*',
        '/dashboard/:path*',
    ],
};
