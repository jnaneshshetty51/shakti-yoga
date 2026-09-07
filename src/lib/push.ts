import { prisma } from '@/lib/prisma';

/**
 * Expo push notifications for the native member app. Talks to Expo's HTTP API
 * directly (same "no SDK" approach as lib/razorpay) — chunks to 100 messages per
 * request and prunes tokens Expo reports as unregistered.
 *
 * Set EXPO_ACCESS_TOKEN in the environment to authenticate send calls
 * (recommended once "Enhanced Security for Push" is on for the Expo project).
 */

const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

export interface PushMessage {
    title: string;
    body: string;
    /** Routed by the app: a web-style path, e.g. "/dashboard/billing". */
    url?: string;
    data?: Record<string, unknown>;
    /** Android channel id registered by the app. */
    channelId?: 'classes' | 'sessions' | 'billing' | 'default';
    badge?: number;
}

interface ExpoTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
}

function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    if (process.env.EXPO_ACCESS_TOKEN) h.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    return h;
}

/** Low-level: push to explicit Expo tokens. Returns tokens to prune. */
async function sendToTokens(tokens: string[], msg: PushMessage): Promise<string[]> {
    const dead: string[] = [];
    for (let i = 0; i < tokens.length; i += CHUNK) {
        const slice = tokens.slice(i, i + CHUNK);
        const payload = slice.map((to) => ({
            to,
            title: msg.title,
            body: msg.body,
            sound: 'default',
            priority: 'high',
            ...(msg.badge !== undefined ? { badge: msg.badge } : {}),
            ...(msg.channelId ? { channelId: msg.channelId } : {}),
            data: { ...(msg.data ?? {}), ...(msg.url ? { url: msg.url } : {}) },
        }));

        let res: Response;
        try {
            res = await fetch(EXPO_SEND_URL, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.error('[push] send request failed:', err);
            continue;
        }

        if (!res.ok) {
            console.error(`[push] Expo responded ${res.status}`);
            continue;
        }

        const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
        json?.data?.forEach((ticket, idx) => {
            if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                dead.push(slice[idx]);
            }
        });
    }
    return dead;
}

/** Push to one or more members by id. Respects opt-outs; prunes stale tokens. */
export async function sendPush(userIds: string | string[], msg: PushMessage): Promise<void> {
    const ids = Array.isArray(userIds) ? [...new Set(userIds)] : [userIds];
    if (ids.length === 0) return;

    const rows = await prisma.pushToken.findMany({
        where: { userId: { in: ids } },
        select: { token: true },
    });
    const tokens = rows.map((r) => r.token).filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));
    if (tokens.length === 0) return;

    const dead = await sendToTokens(tokens, msg);
    if (dead.length > 0) {
        await prisma.pushToken.deleteMany({ where: { token: { in: dead } } }).catch(() => {});
    }
}
