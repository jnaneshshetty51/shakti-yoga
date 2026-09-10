import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { adminAdjustCredits, getSessionBalance } from '@/lib/sessionCredits';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET — a member's credit standing (1:1 therapy credits + capped-plan session ledger). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return forbidden();
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, credits: true } });
    if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const [balance, entries] = await Promise.all([
        getSessionBalance(id),
        prisma.sessionCreditEntry.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 40,
            select: { id: true, delta: true, reason: true, note: true, createdAt: true, cycleStart: true },
        }),
    ]);

    return NextResponse.json({
        member: { id: user.id, name: user.name, email: user.email },
        therapyCredits: user.credits,
        sessionBalance: balance,
        ledger: entries.map((e) => ({
            id: e.id,
            delta: e.delta,
            reason: e.reason,
            note: e.note,
            at: e.createdAt.toISOString(),
            cycleStart: e.cycleStart.toISOString(),
        })),
    });
}

/** POST — adjust credits.  { type: "session" | "therapy", delta, note } */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    const { id } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    const type = body.type === 'therapy' ? 'therapy' : 'session';
    const delta = Math.trunc(Number(body.delta));
    const note = String(body.note || '').slice(0, 200).trim();

    if (!Number.isInteger(delta) || delta === 0) {
        return NextResponse.json({ error: 'Adjustment must be a non-zero whole number.' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, credits: true } });
    if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const audit = auditAs({ id: admin.id, email: admin.email }, request);

    try {
        if (type === 'therapy') {
            const next = Math.max(0, user.credits + delta);
            await prisma.user.update({ where: { id }, data: { credits: next } });
            await audit({ action: 'credits.therapy.adjust', entity: 'User', entityId: id, before: { credits: user.credits }, after: { credits: next, delta, note } });
            return NextResponse.json({ ok: true, therapyCredits: next });
        }

        const balance = await adminAdjustCredits(id, delta, note || 'Manual adjustment', admin.id);
        await audit({ action: 'credits.session.adjust', entity: 'SessionCreditEntry', entityId: id, after: { delta, note, remaining: balance?.remaining } });
        return NextResponse.json({ ok: true, sessionBalance: balance });
    } catch (error) {
        const message = error instanceof Error && error.message.length < 200 ? error.message : 'Could not adjust credits.';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
