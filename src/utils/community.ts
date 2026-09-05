/**
 * @deprecated This file contains deprecated hardcoded data.
 * WhatsApp community groups should now be fetched from API route:
 * - GET /api/community/groups
 * 
 * This file is kept for type definitions and backward compatibility only.
 */

export type CommunityGroup = {
    id: string;
    name: string;
    role: string; // Maps to UserRole
    whatsappLink: string;
    pinnedMessage: string;
};

/**
 * @deprecated Use API route /api/community/groups instead
 * This array is kept for backward compatibility but components
 * should now fetch from the API.
 */
export const initialGroups: CommunityGroup[] = [
    {
        id: 'everyday',
        name: 'Everyday Yoga Batch A',
        role: 'member_everyday',
        whatsappLink: 'https://chat.whatsapp.com/mock-everyday-link',
        pinnedMessage: "Welcome! Tomorrow's class focuses on hip openers. Bring a strap!"
    },
    {
        id: 'therapy',
        name: 'Therapy Circle',
        role: 'member_therapy',
        whatsappLink: 'https://chat.whatsapp.com/mock-therapy-link',
        pinnedMessage: 'Reminder: Dr. Rao is available for Q&A this Saturday at 5 PM IST.'
    },
    {
        id: 'trial',
        name: 'New Joiners & Trial',
        role: 'trial',
        whatsappLink: 'https://chat.whatsapp.com/mock-trial-link',
        pinnedMessage: "Hope you enjoyed your first class! Feel free to ask any questions here."
    }
];

/**
 * @deprecated Use fetch('/api/community/groups') instead
 */
export const getGroups = () => initialGroups;

/**
 * @deprecated Use API route instead
 */
export const updateGroup = (id: string, data: Partial<CommunityGroup>) => {
    const group = initialGroups.find(g => g.id === id);
    if (group) {
        Object.assign(group, data);
        return group;
    }
    return null;
};
