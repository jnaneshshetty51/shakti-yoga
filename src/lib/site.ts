const raw = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');

/** Canonical public origin. Ignores a localhost value left in prod .env. */
export const SITE_URL = raw && !raw.includes('localhost') ? raw : 'https://shaktiyoga.in';

export const SITE_NAME = 'Shakti Yoga';
export const SITE_TAGLINE = 'Premium online yoga & 1:1 yoga therapy, live from India';
export const SITE_DESCRIPTION =
    'Everyday live yoga classes and personalised 1:1 yoga therapy for NRIs and seekers worldwide — taught from India, joined over Google Meet.';
