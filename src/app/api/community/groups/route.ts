import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback groups for when DB is unavailable
const FALLBACK_GROUPS = [
    {
        id: 'everyday',
        name: 'Everyday Yoga Batch A',
        role: 'MEMBER_EVERYDAY',
        whatsappLink: 'https://chat.whatsapp.com/mock-everyday-link',
        pinnedMessage: "Welcome! Tomorrow's class focuses on hip openers. Bring a strap!"
    },
    {
        id: 'therapy',
        name: 'Therapy Circle',
        role: 'MEMBER_THERAPY',
        whatsappLink: 'https://chat.whatsapp.com/mock-therapy-link',
        pinnedMessage: 'Reminder: Dr. Rao is available for Q&A this Saturday at 5 PM IST.'
    },
    {
        id: 'trial',
        name: 'New Joiners & Trial',
        role: 'TRIAL',
        whatsappLink: 'https://chat.whatsapp.com/mock-trial-link',
        pinnedMessage: "Hope you enjoyed your first class! Feel free to ask any questions here."
    }
];

export async function GET() {
    try {
        const groups = await prisma.whatsAppGroup.findMany({
            where: { active: true },
            orderBy: { id: 'asc' }
        });

        const formattedGroups = groups.map(g => ({
            id: g.id,
            name: g.name,
            role: g.role,
            whatsappLink: g.link,
            pinnedMessage: g.pinnedMessage || ''
        }));

        return NextResponse.json(formattedGroups.length > 0 ? formattedGroups : FALLBACK_GROUPS);
    } catch (error) {
        console.error('Error fetching community groups:', error);
        return NextResponse.json(FALLBACK_GROUPS);
    }
}