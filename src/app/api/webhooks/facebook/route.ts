import { NextResponse } from 'next/server';
import { verifyMetaSignature, saveMetaLead } from '@/lib/meta';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

/**
 * Facebook Webhook verification endpoint (handshake).
 * Meta sends GET request when you configure the Callback URL in the Developer Portal.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (!VERIFY_TOKEN) {
        console.warn('[facebook-webhook] META_WEBHOOK_VERIFY_TOKEN not configured');
        return new Response('Webhook not configured', { status: 503 });
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[facebook-webhook] Verification handshake successful');
        return new Response(challenge, { status: 200 });
    }

    console.warn('[facebook-webhook] Verification failed.');
    return new Response('Forbidden', { status: 403 });
}

/**
 * Facebook Webhook receiver for Lead Ads events.
 * Triggered automatically whenever a user submits a Meta Instant Form.
 */
export async function POST(request: Request) {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    if (!process.env.META_APP_SECRET) {
        console.warn('[facebook-webhook] META_APP_SECRET not configured — rejecting webhook');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    // Verify cryptographic signature from Meta
    if (!verifyMetaSignature(rawBody, signature)) {
        console.error('[facebook-webhook] Invalid HMAC signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    let payload: {
        object?: string;
        entry?: Array<{
            id?: string;
            time?: number;
            changes?: Array<{
                field?: string;
                value?: {
                    ad_id?: string;
                    form_id?: string;
                    leadgen_id?: string;
                    created_time?: number;
                    page_id?: string;
                };
            }>;
        }>;
    };

    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
    }

    if (payload.object === 'page' && Array.isArray(payload.entry)) {
        for (const entry of payload.entry) {
            const pageId = entry.id;
            if (!Array.isArray(entry.changes)) continue;

            for (const change of entry.changes) {
                if (change.field === 'leadgen' && change.value) {
                    const { leadgen_id, form_id, ad_id, created_time } = change.value;

                    if (leadgen_id) {
                        try {
                            await saveMetaLead({
                                leadgenId: leadgen_id,
                                formId: form_id,
                                adId: ad_id,
                                pageId: pageId || change.value.page_id,
                                createdTime: created_time,
                            });
                        } catch (leadError) {
                            console.error(`[facebook-webhook] Error processing leadgen ${leadgen_id}:`, leadError);
                        }
                    }
                }
            }
        }
    }

    // Always respond 200 OK to Meta quickly so it does not retry
    return NextResponse.json({ received: true });
}
