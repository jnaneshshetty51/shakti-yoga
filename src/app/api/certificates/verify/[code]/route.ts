import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates/verify/[code] — genuinely public, no account required.
 * Every issued certificate's QR code points here for third-party verification
 * (an employer, another studio) — requiring a Shakti login defeated that
 * purpose entirely. Only returns what's needed to confirm validity, nothing
 * else about the holder.
 */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
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
