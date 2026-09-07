import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { askAssistant, assistantAvailable, type ChatTurn } from '@/lib/assistant';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET — is the assistant configured? (app hides the feature if not) */
export async function GET() {
    return NextResponse.json({ available: assistantAvailable() });
}

/** POST { messages: [{role, content}] } -> { reply } */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!assistantAvailable()) {
        return NextResponse.json({ error: 'The assistant is not available.' }, { status: 503 });
    }

    const { allowed, retryAfterSeconds } = rateLimit(`assistant:${session.id}`, 30, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'You’ve reached the hourly limit for the assistant. Try again later.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    const body = await request.json().catch(() => ({}));
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const turns: ChatTurn[] = raw
        .filter((m: unknown): m is ChatTurn =>
            !!m && typeof m === 'object' &&
            (('role' in m && (m.role === 'user' || m.role === 'assistant'))) &&
            'content' in m && typeof (m as ChatTurn).content === 'string',
        )
        .slice(-20);

    if (turns.length === 0) {
        return NextResponse.json({ error: 'Say something first.' }, { status: 400 });
    }

    const result = await askAssistant(turns);
    return NextResponse.json(
        { reply: result.reply, ok: result.ok },
        { status: result.ok ? 200 : 200, headers: { 'Cache-Control': 'no-store' } },
    );
}
