import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const teacher = await requireTeacher();
        if (!teacher) return forbidden();

        const { id } = await props.params;

        const post = await prisma.content.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                category: true,
                author: true,
                imageUrl: true,
                excerpt: true,
                body: true,
                tags: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
                createdByUserId: true,
            },
        });

        if (!post) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        if (post.createdByUserId !== teacher.id && teacher.role !== 'admin') {
            return forbidden();
        }

        return NextResponse.json({ post, teacherName: teacher.name });
    } catch (error) {
        console.error('Teacher blog get single error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
