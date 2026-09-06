import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await prisma.story.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Story deleted successfully' });
    } catch (error) {
        console.error('Failed to delete story:', error);
        return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { title, content, status } = body;

        const updateData: Record<string, unknown> = {};
        if (title) updateData.title = title;
        if (content) updateData.content = content;
        if (status) updateData.status = status.toUpperCase();

        const updatedStory = await prisma.story.update({
            where: { id },
            data: updateData,
            include: {
                user: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Story updated successfully',
            story: updatedStory
        });
    } catch (error) {
        console.error('Failed to update story:', error);
        return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
    }
}
