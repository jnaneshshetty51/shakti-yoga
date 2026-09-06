import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/admin/', '/api/', '/checkout', '/onboarding', '/reset-password', '/welcome'],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
