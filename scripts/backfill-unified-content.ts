/**
 * One-time data migration for the Content Management unification: folds the
 * legacy `Practice` and `BlogPost` tables into the single `Content` model,
 * and converts old `Content.type` values (REEL/POST) to the new taxonomy.
 *
 * Must run AFTER the additive migration (20260915164710_content_unify_additive)
 * and BEFORE the cleanup migration that drops BlogPost/Practice/PracticeCompletion
 * and the old relatedBlogId/relatedPracticeId columns — those old tables/columns
 * are read here via raw SQL since they're no longer part of the Prisma schema,
 * even though they still physically exist in the database at this point.
 *
 * Reuses each row's original id as the new Content row's id, so:
 *  - existing FKs into BlogPost/Practice (relatedBlogId, relatedPracticeId,
 *    PracticeCompletion.practiceId) keep pointing at a valid row after the swap
 *  - BlogPost.slug-based public URLs (/blog/<slug>) keep resolving unchanged
 *
 * Safe to re-run: every step is idempotent (checks before inserting/updating).
 */
import { PrismaClient, ContentCategory, ContentDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

const CONTENT_CATEGORIES: ContentCategory[] = [
    'YOGA', 'BREATHING', 'MINDFULNESS', 'MOBILITY', 'SLEEP', 'STRENGTH',
    'WELLNESS', 'BEGINNERS', 'PHILOSOPHY', 'THERAPY', 'STUDIO', 'COMMUNITY',
];
function toContentCategory(v: unknown): ContentCategory {
    const s = String(v || '').toUpperCase();
    return (CONTENT_CATEGORIES as string[]).includes(s) ? (s as ContentCategory) : 'YOGA';
}

const DIFFICULTIES: ContentDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ALL_LEVELS', 'ADVANCED'];
function toDifficulty(v: unknown): ContentDifficulty {
    const s = String(v || '').toUpperCase();
    return (DIFFICULTIES as string[]).includes(s) ? (s as ContentDifficulty) : 'ALL_LEVELS';
}

async function ensureUniqueSlug(base: string, ownId: string): Promise<string> {
    let slug = base;
    let n = 2;
    for (;;) {
        const clash = await prisma.content.findUnique({ where: { slug }, select: { id: true } });
        if (!clash || clash.id === ownId) return slug;
        slug = `${base}-${n++}`;
    }
}

async function main() {
    // 1. REEL -> VIDEO, POST -> ARTICLE on existing Content rows. Raw SQL: the
    // regenerated Prisma Client's ContentType no longer includes REEL/POST as
    // TS literals, but the Postgres enum still has both old and new members
    // until the cleanup migration runs, so a plain UPDATE is valid.
    const reelToVideo = await prisma.$executeRawUnsafe(
        `UPDATE "Content" SET type = 'VIDEO' WHERE type = 'REEL'`,
    );
    const postToArticle = await prisma.$executeRawUnsafe(
        `UPDATE "Content" SET type = 'ARTICLE' WHERE type = 'POST'`,
    );
    console.log(`[1] Content: REEL->VIDEO (${reelToVideo}), POST->ARTICLE (${postToArticle})`);

    // 2. Practice -> Content (type SHORT_PRACTICE), reusing the Practice id.
    const practices = await prisma.$queryRawUnsafe<
        Array<{
            id: string; title: string; slug: string; description: string | null; steps: string | null;
            category: string; level: string; durationMin: number; videoUrl: string | null;
            thumbnailUrl: string | null; status: string; publishedAt: Date | null;
            createdAt: Date; updatedAt: Date;
        }>
    >(`SELECT * FROM "Practice"`);

    let practicesMigrated = 0;
    for (const p of practices) {
        const exists = await prisma.content.findUnique({ where: { id: p.id }, select: { id: true } });
        if (exists) continue;
        const slug = await ensureUniqueSlug(p.slug, p.id);
        await prisma.content.create({
            data: {
                id: p.id,
                type: 'SHORT_PRACTICE',
                status: p.status as never,
                category: toContentCategory(p.category),
                title: p.title,
                slug,
                body: p.description,
                steps: p.steps,
                durationMin: p.durationMin,
                difficulty: toDifficulty(p.level),
                videoUrl: p.videoUrl,
                imageUrl: p.thumbnailUrl,
                access: 'PUBLIC',
                language: 'English',
                publishedAt: p.publishedAt,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            },
        });
        practicesMigrated++;
    }
    console.log(`[2] Practice -> Content: ${practicesMigrated}/${practices.length} migrated`);

    // 3. BlogPost -> Content (type ARTICLE), reusing the BlogPost id.
    const blogs = await prisma.$queryRawUnsafe<
        Array<{
            id: string; slug: string; title: string; excerpt: string | null; content: string;
            category: string; author: string; publishedAt: Date | null; status: string;
            imageUrl: string | null; featuredImage: string | null; metaTitle: string | null;
            metaDescription: string | null; ctaType: string | null; ctaLabel: string | null;
            relatedClassBatchId: string | null; relatedPracticeId: string | null;
            createdAt: Date; updatedAt: Date;
        }>
    >(`SELECT * FROM "BlogPost"`);

    let blogsMigrated = 0;
    for (const b of blogs) {
        const exists = await prisma.content.findUnique({ where: { id: b.id }, select: { id: true } });
        if (exists) continue;
        const slug = await ensureUniqueSlug(b.slug, b.id);
        await prisma.content.create({
            data: {
                id: b.id,
                type: 'ARTICLE',
                status: b.status as never,
                category: toContentCategory(b.category),
                title: b.title,
                slug,
                excerpt: b.excerpt,
                body: b.content,
                imageUrl: b.imageUrl ?? b.featuredImage,
                author: b.author,
                metaTitle: b.metaTitle,
                metaDescription: b.metaDescription,
                ctaType: b.ctaType,
                ctaLabel: b.ctaLabel,
                relatedClassBatchId: b.relatedClassBatchId,
                relatedContentId: b.relatedPracticeId, // Practice already migrated with the same id
                access: 'PUBLIC',
                publishedAt: b.publishedAt,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,
            },
        });
        blogsMigrated++;
    }
    console.log(`[3] BlogPost -> Content: ${blogsMigrated}/${blogs.length} migrated`);

    // 4. Point every pre-existing Content row's relatedContentId at whichever of
    // the old relatedBlogId/relatedPracticeId was set (both now valid Content ids).
    const relatedRows = await prisma.$queryRawUnsafe<
        Array<{ id: string; relatedBlogId: string | null; relatedPracticeId: string | null }>
    >(`SELECT id, "relatedBlogId", "relatedPracticeId" FROM "Content" WHERE "relatedBlogId" IS NOT NULL OR "relatedPracticeId" IS NOT NULL`);
    let relatedLinked = 0;
    for (const r of relatedRows) {
        const target = r.relatedBlogId ?? r.relatedPracticeId;
        if (!target) continue;
        await prisma.content.update({ where: { id: r.id }, data: { relatedContentId: target } }).catch(() => {});
        relatedLinked++;
    }
    console.log(`[4] relatedContentId backfilled on ${relatedLinked} rows`);

    // 5. PracticeCompletion -> ContentCompletion.
    const completions = await prisma.$queryRawUnsafe<
        Array<{ id: string; userId: string; practiceId: string; minutes: number; completedAt: Date }>
    >(`SELECT * FROM "PracticeCompletion"`);
    let completionsMigrated = 0;
    for (const c of completions) {
        const exists = await prisma.contentCompletion.findUnique({ where: { id: c.id }, select: { id: true } }).catch(() => null);
        if (exists) continue;
        await prisma.contentCompletion.create({
            data: { id: c.id, userId: c.userId, contentId: c.practiceId, minutes: c.minutes, completedAt: c.completedAt },
        });
        completionsMigrated++;
    }
    console.log(`[5] PracticeCompletion -> ContentCompletion: ${completionsMigrated}/${completions.length} migrated`);

    // 6. Sanity check.
    const [contentCount, byType] = await Promise.all([
        prisma.content.count(),
        prisma.content.groupBy({ by: ['type'], _count: true }),
    ]);
    console.log(`[6] Content now has ${contentCount} rows:`, byType);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
