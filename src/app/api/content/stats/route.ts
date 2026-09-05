import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback stats for when DB is unavailable
const FALLBACK_STATS = {
    totalStudents: 200,
    countriesCount: 15,
    classesPerWeek: 5,
    classTimeIST: "5:00 AM",
    hasWhatsAppSupport: true
};

export async function GET() {
    try {
        // Get real stats from database
        const [studentsStat, countriesStat] = await Promise.all([
            prisma.siteStats.findFirst({ where: { statKey: 'totalStudents' } }),
            prisma.siteStats.findFirst({ where: { statKey: 'countriesCount' } })
        ]);

        // Get count of active subscriptions (members)
        const activeMembersCount = await prisma.subscription.count({
            where: { status: 'ACTIVE' }
        });

        // Get count of distinct countries from users
        const countryGroups = await prisma.user.groupBy({
            by: ['country'],
            where: { country: { not: null } }
        });
        const countriesCount = countryGroups.length;

        const stats = {
            totalStudents: activeMembersCount || parseInt(studentsStat?.statValue || '200'),
            countriesCount: countriesCount || parseInt(countriesStat?.statValue || '15'),
            classesPerWeek: 5,
            classTimeIST: "5:00 AM",
            hasWhatsAppSupport: true
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(FALLBACK_STATS);
    }
}