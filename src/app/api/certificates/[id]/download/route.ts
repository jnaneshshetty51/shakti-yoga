import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { renderCertificatePdf } from '@/lib/certificate';

/** GET /api/certificates/[id]/download — the caller's own approved certificate, as a PDF. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;

    const certificate = await prisma.certificate.findUnique({ where: { id } });
    if (!certificate || certificate.userId !== session.id || certificate.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const pdf = await renderCertificatePdf({
        holderName: session.name,
        title: certificate.title,
        issuedAt: certificate.approvedAt ?? certificate.issuedAt,
        verificationCode: certificate.verificationCode,
    });

    return new NextResponse(Buffer.from(pdf), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="shakti-certificate-${certificate.verificationCode}.pdf"`,
        },
    });
}
