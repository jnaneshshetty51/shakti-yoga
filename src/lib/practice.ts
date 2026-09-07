import type { Practice, PracticeLevel } from '@prisma/client';

export const PRACTICE_LEVELS: PracticeLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ALL_LEVELS'];

export const LEVEL_LABEL: Record<PracticeLevel, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ALL_LEVELS: 'All levels',
};

export function toPracticeLevel(v: unknown): PracticeLevel {
    const s = String(v || '').toUpperCase();
    return (PRACTICE_LEVELS as string[]).includes(s) ? (s as PracticeLevel) : 'ALL_LEVELS';
}

export interface PracticeView {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    steps: string | null;
    category: string;
    level: PracticeLevel;
    durationMin: number;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    completed?: boolean;
    completionCount?: number;
}

export function serializePractice(
    row: Practice,
    extra: { completed?: boolean; completionCount?: number } = {},
): PracticeView {
    return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        steps: row.steps,
        category: row.category,
        level: row.level,
        durationMin: row.durationMin,
        videoUrl: row.videoUrl,
        thumbnailUrl: row.thumbnailUrl,
        ...extra,
    };
}
