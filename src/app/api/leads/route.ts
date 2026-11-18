import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/admin-auth';
import { queryLeads } from '@/lib/admin-db';

export async function GET(req: NextRequest) {
  const auth = await isAuthenticatedAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(250, parseInt(searchParams.get('limit') || '100', 10)));
    const formType = (searchParams.get('form_type') || 'all').trim();
    const status = (searchParams.get('status') || 'all').trim();
    const date = (searchParams.get('date') || '').trim();
    const dateFrom = (searchParams.get('date_from') || '').trim();
    const dateTo = (searchParams.get('date_to') || '').trim();
    const search = (searchParams.get('search') || '').trim();

    const result = await queryLeads({
      page,
      limit,
      formType,
      status,
      date,
      dateFrom,
      dateTo,
      search,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[Admin API /api/leads] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve leads.' },
      { status: 500 }
    );
  }
}

