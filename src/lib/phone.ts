/**
 * Utilities for formatting and cleaning phone numbers across CRM, leads,
 * retreats, and customer support.
 */

/**
 * Strips non-digits and ensures that 10-digit Indian phone numbers include the
 * country code prefix '91' so that https://wa.me/ links open the conversation
 * directly without errors.
 */
export function cleanWhatsAppPhone(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    return digits;
}

/**
 * Builds a direct wa.me URL for one-click chat outreach with optional pre-filled text.
 */
export function toWhatsAppUrl(phone: string | null | undefined, message?: string): string {
    const digits = cleanWhatsAppPhone(phone);
    if (!digits) return '';
    const qs = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${digits}${qs}`;
}
