import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/stories/submit — member-facing testimonial submission.
 * Creates a Story with status=DRAFT so an admin must approve it before
 * it appears publicly. Rate-limited to prevent spam.
 */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Please log in to submit a testimonial.' }, { status: 401 });
    }

    const { allowed, retryAfterSeconds } = await rateLimit(`story-submit:${session.id}`, 3, 24 * 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'You can only submit a few testimonials per day. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    const body = await request.json();
    const { quote, rating, imageUrl, videoUrl } = body as {
        quote?: string;
        rating?: number;
        imageUrl?: string;
        videoUrl?: string;
    };

    if (!quote || typeof quote !== 'string' || quote.trim().length < 10) {
        return NextResponse.json(
            { error: 'Please write at least a few words about your experience.' },
            { status: 400 },
        );
    }

    if (quote.trim().length > 2000) {
        return NextResponse.json(
            { error: 'Testimonial is too long (max 2000 characters).' },
            { status: 400 },
        );
    }

    const ratingNum = typeof rating === 'number' ? Math.min(5, Math.max(1, Math.round(rating))) : 5;

    const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
            name: true,
            country: true,
            subscription: { select: { planType: true } },
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const PLAN_LABEL: Record<string, string> = {
        EVERYDAY_YOGA: 'Everyday Yoga',
        YOGA_THERAPY: 'Yoga Therapy',
        STARTER: 'Starter',
        FAMILY: 'Family',
        TRIAL: 'Free Trial',
    };

    const story = await prisma.story.create({
        data: {
            userId: session.id,
            authorName: user.name,
            location: user.country ?? null,
            planType: user.subscription?.planType
                ? PLAN_LABEL[user.subscription.planType] ?? user.subscription.planType
                : null,
            quote: quote.trim(),
            rating: ratingNum,
            status: 'DRAFT', // admin must approve
            imageUrl: typeof imageUrl === 'string' && imageUrl.startsWith('http') ? imageUrl : null,
        },
    });

    return NextResponse.json({
        id: story.id,
        message: 'Thank you! Your testimonial has been submitted for review.',
    });
}
