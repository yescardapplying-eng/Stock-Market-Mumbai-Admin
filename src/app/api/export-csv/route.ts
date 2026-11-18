import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/admin-auth';
import { queryLeads } from '@/lib/admin-db';

function csvCell(val: unknown): string {
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  const auth = await isAuthenticatedAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const result = await queryLeads({
    page: 1,
    limit: 5000,
    formType: (searchParams.get('form_type') || 'all').trim(),
    status: (searchParams.get('status') || 'all').trim(),
    date: (searchParams.get('date') || '').trim(),
    dateFrom: (searchParams.get('date_from') || '').trim(),
    dateTo: (searchParams.get('date_to') || '').trim(),
    search: (searchParams.get('search') || '').trim(),
  });

  const headers = [
    'Ref ID',
    'Source Form',
    'Full Name',
    'Mobile Number',
    'State',
    'Segment',
    'Capital Range',
    'Message',
    'Source Page',
    'Status',
    'IST Time',
  ];

  const lines = [headers.map(csvCell).join(',')];
  for (const row of result.data) {
    lines.push(
      [
        row.lead_reference,
        row.form_type === 'popup' ? 'Popup Form' : 'Contact Us',
        row.full_name,
        row.mobile_number,
        row.state || '',
        row.segment || '',
        row.capital_range || '',
        row.message || '',
        row.source_page || '/',
        row.status,
        row.created_at_formatted || row.created_at,
      ]
        .map(csvCell)
        .join(',')
    );
  }

  const csvBody = '\uFEFF' + lines.join('\r\n');
  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stock-market-mumbai-leads-${fileDate}.csv"`,
    },
  });
}

