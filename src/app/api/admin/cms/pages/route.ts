import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import {
    getAboutPageContent,
    getHomePageContent,
    getCorporatePageContent,
    saveCmsValues,
} from '@/lib/cms';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    if (!(await requireDepartment('CONTENT'))) return forbidden();

    const [about, home, corporate] = await Promise.all([
        getAboutPageContent(),
        getHomePageContent(),
        getCorporatePageContent(),
    ]);

    return NextResponse.json({
        pages: {
            about,
            home,
            corporate,
        },
    });
}

export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const page = String(body.page || '').toLowerCase();
    const data = body.data;

    if (!page || !data || typeof data !== 'object') {
        return NextResponse.json({ error: 'Invalid page or payload.' }, { status: 400 });
    }

    if (!['about', 'home', 'corporate'].includes(page)) {
        return NextResponse.json({ error: `Unknown page: ${page}` }, { status: 400 });
    }

    await saveCmsValues(page, data);

    const audit = auditAs({ id: admin.id, email: admin.email }, request);
    await audit({
        action: `cms.page.${page}.update`,
        entity: 'CmsPageContent',
        entityId: page,
        after: data,
    });

    return NextResponse.json({ success: true });
}
