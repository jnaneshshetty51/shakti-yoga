import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';
import type { SessionPayload } from '@/lib/jwt';

/**
 * Append-only record of a privileged action. Never throws — an audit-write
 * failure must not break the action it is recording (it is logged instead).
 */
export async function recordAudit(entry: {
    actorId?: string | null;
    actorEmail?: string | null;
    action: string; // "user.role.change", "subscription.update", "class.instance.cancel", ...
    entity: string; // "User" | "Subscription" | "ClassBatch" | ...
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    ip?: string | null;
}): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                actorId: entry.actorId ?? null,
                actorEmail: entry.actorEmail ?? null,
                action: entry.action,
                entity: entry.entity,
                entityId: entry.entityId ?? null,
                before: entry.before === undefined ? undefined : JSON.parse(JSON.stringify(entry.before)),
                after: entry.after === undefined ? undefined : JSON.parse(JSON.stringify(entry.after)),
                ip: entry.ip ?? null,
            },
        });
    } catch (error) {
        console.error('[audit] failed to record', entry.action, error);
    }
}

/** Convenience wrapper when you have the admin session + the request in hand. */
export function auditAs(
    actor: Pick<SessionPayload, 'id' | 'email'> | null,
    request: Request | null,
) {
    const ip = request ? getClientIp(request) : null;
    return (
        args: Omit<Parameters<typeof recordAudit>[0], 'actorId' | 'actorEmail' | 'ip'>,
    ) => recordAudit({ ...args, actorId: actor?.id ?? null, actorEmail: actor?.email ?? null, ip });
}
