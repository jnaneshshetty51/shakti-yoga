import type { Content, ContentType } from '@prisma/client';
import { DIFFICULTY_LABEL, toContentDifficulty } from '@/lib/content';

/**
 * "Practice" is a view over Content, not its own model — Short Practices and
 * Take a Moment micro-practices are Content rows like everything else (see
 * src/lib/content.ts). This file keeps the pre-unification PracticeView
 * contract stable for /api/practices* and the dashboard, since those response
 * shapes are relied on unchanged by both the web dashboard and mobile app.
 */
export const PRACTICE_TYPES: ContentType[] = ['SHORT_PRACTICE', 'TAKE_A_MOMENT'];

export const LEVEL_LABEL = DIFFICULTY_LABEL;
export const toPracticeLevel = toContentDifficulty;

export interface PracticeView {
    id: string;
    title: string;
    slug: string | null;
    description: string | null;
    steps: string | null;
    category: string;
    level: string;
    durationMin: number;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    completed?: boolean;
    completionCount?: number;
}

export function serializePractice(
    row: Content,
    extra: { completed?: boolean; completionCount?: number } = {},
): PracticeView {
    return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.body,
        steps: row.steps,
        category: row.category,
        level: row.difficulty ?? 'ALL_LEVELS',
        durationMin: row.durationMin ?? 10,
        videoUrl: row.videoUrl,
        thumbnailUrl: row.imageUrl,
        ...extra,
    };
}
