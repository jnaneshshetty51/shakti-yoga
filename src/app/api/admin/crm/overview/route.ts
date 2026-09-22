import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { LeadStatus, CorporateLeadStatus, RetreatEnquiryStatus, ReferralStatus } from '@prisma/client';

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            leadStageGroups,
            leadsThisMonthCount,
            overdueLeadsCount,
            corporateDeals,
            retreatEnquiries,
            upcomingRetreatsCount,
            referrals,
        ] = await Promise.all([
            // 1. Leads by stage
            prisma.lead.groupBy({
                by: ['status'],
                _count: { id: true },
            }),

            // Leads added this month
            prisma.lead.count({
                where: { createdAt: { gte: startOfMonth } },
            }),

            // Overdue lead follow-ups
            prisma.lead.count({
                where: {
                    nextFollowUpAt: { lte: now },
                    status: { notIn: [LeadStatus.CONVERTED, LeadStatus.LOST] },
                },
            }),

            // 2. Corporate deals
            prisma.corporateLead.findMany({
                select: {
                    status: true,
                    dealValue: true,
                },
            }),

            // 3. Retreat & workshop enquiries
            prisma.retreatEnquiry.findMany({
                select: {
                    status: true,
                    participantsCount: true,
                },
            }),

            // Active/upcoming published retreats
            prisma.retreat.count({
                where: {
                    status: 'PUBLISHED',
                    endDate: { gte: now },
                },
            }),

            // 4. Referrals
            prisma.referral.findMany({
                select: {
                    status: true,
                    rewardAmount: true,
                },
            }),
        ]);

        // Process leads
        const leadCounts: Record<string, number> = {
            NEW: 0, CONTACTED: 0, TRIAL: 0, CONVERTED: 0, LOST: 0,
        };
        let totalLeads = 0;
        for (const g of leadStageGroups) {
            leadCounts[g.status] = g._count.id;
            totalLeads += g._count.id;
        }
        const leadConversionRate = totalLeads > 0
            ? Math.round(((leadCounts.CONVERTED || 0) / totalLeads) * 100)
            : 0;

        // Process Corporate
        let corporatePipelineValue = 0;
        let corporateWonValue = 0;
        let corporateInProposal = 0;
        let corporateActiveDeals = 0;

        for (const deal of corporateDeals) {
            const val = deal.dealValue || 0;
            if (deal.status === CorporateLeadStatus.CONFIRMED || deal.status === CorporateLeadStatus.PAYMENT || deal.status === CorporateLeadStatus.COMPLETED) {
                corporateWonValue += val;
            }
            if (deal.status !== CorporateLeadStatus.LOST && deal.status !== CorporateLeadStatus.COMPLETED) {
                corporatePipelineValue += val;
                corporateActiveDeals++;
            }
            if (deal.status === CorporateLeadStatus.PROPOSAL || deal.status === CorporateLeadStatus.DISCUSSION) {
                corporateInProposal++;
            }
        }

        // Process Retreats
        let retreatTotalEnquiries = 0;
        let retreatConfirmedParticipants = 0;
        let retreatNewEnquiries = 0;

        for (const enq of retreatEnquiries) {
            retreatTotalEnquiries++;
            if (enq.status === RetreatEnquiryStatus.CONFIRMED || enq.status === RetreatEnquiryStatus.PAID) {
                retreatConfirmedParticipants += enq.participantsCount || 1;
            }
            if (enq.status === RetreatEnquiryStatus.NEW) {
                retreatNewEnquiries++;
            }
        }

        // Process Referrals
        let totalReferrals = 0;
        let successfulReferrals = 0;
        let pendingReferrals = 0;
        let totalRewardedAmount = 0;

        for (const ref of referrals) {
            totalReferrals++;
            if (ref.status === ReferralStatus.SUCCESSFUL) {
                successfulReferrals++;
                totalRewardedAmount += ref.rewardAmount || 0;
            } else if (ref.status === ReferralStatus.PENDING) {
                pendingReferrals++;
            }
        }

        return NextResponse.json({
            leads: {
                total: totalLeads,
                new: leadCounts.NEW,
                contacted: leadCounts.CONTACTED,
                trial: leadCounts.TRIAL,
                converted: leadCounts.CONVERTED,
                lost: leadCounts.LOST,
                overdueFollowUps: overdueLeadsCount,
                thisMonth: leadsThisMonthCount,
                conversionRate: leadConversionRate,
            },
            corporate: {
                totalDeals: corporateDeals.length,
                activeDeals: corporateActiveDeals,
                pipelineValue: corporatePipelineValue,
                wonValue: corporateWonValue,
                inProposal: corporateInProposal,
            },
            retreats: {
                totalEnquiries: retreatTotalEnquiries,
                newEnquiries: retreatNewEnquiries,
                confirmedParticipants: retreatConfirmedParticipants,
                upcomingEvents: upcomingRetreatsCount,
            },
            referrals: {
                total: totalReferrals,
                successful: successfulReferrals,
                pending: pendingReferrals,
                rewardedAmount: totalRewardedAmount,
            },
        });
    } catch (error) {
        console.error('CRM overview API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
