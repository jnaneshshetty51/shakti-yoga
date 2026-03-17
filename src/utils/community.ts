export type CommunityGroup = {
    id: string;
    name: string;
    role: string; // Maps to UserRole
    whatsappLink: string;
    pinnedMessage: string;
};

// Mock Data
export const initialGroups: CommunityGroup[] = [
    {
        id: 'everyday',
        name: 'Everyday Yoga Batch A',
        role: 'member_everyday',
        whatsappLink: 'https://chat.whatsapp.com/mock-everyday-link',
        pinnedMessage: 'Welcome! Tomorrow\'s class focuses on hip openers. Bring a strap!'
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
        pinnedMessage: 'Hope you enjoyed your first class! Feel free to ask any questions here.'
    }
];

// In a real app, these would be API calls
export const getGroups = () => initialGroups;

export const updateGroup = (id: string, data: Partial<CommunityGroup>) => {
    const group = initialGroups.find(g => g.id === id);
    if (group) {
        Object.assign(group, data);
        return group;
    }
    return null;
};
