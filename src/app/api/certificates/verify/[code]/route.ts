import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/** GET /api/certificates/verify/[code] — public verification, requires a Shakti account. */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Sign in to verify this certificate.' }, { status: 401 });
    const { code } = await context.params;

    const certificate = await prisma.certificate.findUnique({
        where: { verificationCode: code },
        include: { user: { select: { name: true } } },
    });

    if (!certificate || certificate.status !== 'APPROVED') {
        return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
        valid: true,
        holderName: certificate.user.name,
        title: certificate.title,
        issuedAt: certificate.approvedAt ?? certificate.issuedAt,
    });
}
