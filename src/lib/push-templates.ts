import type { PushMessage } from '@/lib/push';

/**
 * Fixed-copy transactional push notifications — the actual message text is
 * the same every time they fire, unlike admin broadcasts (author-supplied)
 * or content-publish notices (built from the published item). Named here,
 * next to each other, so a copy change doesn't require finding every call
 * site by grep, and so two call sites can't quietly drift apart on wording.
 */
export const pushTemplates = {
    membershipRenewed: (planName: string): PushMessage => ({
        title: 'Membership renewed',
        body: `Your ${planName} plan renewed successfully.`,
        url: '/dashboard/billing',
        channelId: 'billing',
    }),
    paymentFailed: (): PushMessage => ({
        title: 'A payment did not go through',
        body: 'Update your payment method to keep your Shakti Yoga access.',
        url: '/dashboard/billing',
        channelId: 'billing',
    }),
    sessionLinkReady: (): PushMessage => ({
        title: 'Your session link is ready',
        body: 'Tap to open your 1:1 session details.',
        url: '/dashboard/therapy/book',
        channelId: 'sessions',
    }),
};
