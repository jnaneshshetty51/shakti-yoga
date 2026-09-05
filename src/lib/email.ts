/**
 * Transactional email via Resend (https://resend.com).
 *
 * Env:
 *   RESEND_API_KEY   - required to actually send; unset = calls are no-ops (logged).
 *   EMAIL_FROM       - "Shakti Yoga <hello@shaktiyoga.in>" (defaults to Resend's sandbox sender).
 *   ADMIN_EMAIL      - where contact-form / ops notifications go.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'Shakti Yoga <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export function isEmailConfigured(): boolean {
    return Boolean(RESEND_API_KEY);
}

interface SendArgs {
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn(`[email] skipped (RESEND_API_KEY unset): "${subject}" -> ${Array.isArray(to) ? to.join(', ') : to}`);
        return false;
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                ...(replyTo ? { reply_to: replyTo } : {}),
            }),
        });
        if (!res.ok) {
            console.error('[email] Resend error', res.status, await res.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('[email] send failed', error);
        return false;
    }
}

export async function notifyAdmin(subject: string, html: string, replyTo?: string): Promise<boolean> {
    if (!ADMIN_EMAIL) {
        console.warn(`[email] admin notification skipped (ADMIN_EMAIL unset): "${subject}"`);
        return false;
    }
    return sendEmail({ to: ADMIN_EMAIL, subject, html, replyTo });
}

/** Minimal branded wrapper so all emails look consistent. */
export function emailLayout(bodyHtml: string): string {
    return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#2d2a26">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#4A6741;padding:16px 0;border-bottom:2px solid #eee;letter-spacing:1px">Shakti Yoga</div>
        <div style="padding:24px 0;font-size:15px;line-height:1.6">${bodyHtml}</div>
        <div style="border-top:1px solid #eee;padding-top:16px;font-size:12px;color:#999">Shakti Yoga · Udupi, Karnataka</div>
    </div>`;
}
