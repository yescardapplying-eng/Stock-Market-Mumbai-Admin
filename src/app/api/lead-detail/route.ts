import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/admin-auth';
import { getLeadById, updateLeadById, LeadRecord } from '@/lib/admin-db';

export async function GET(req: NextRequest) {
  const auth = await isAuthenticatedAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0', 10);
  if (!id) {
    return NextResponse.json({ success: false, message: 'Missing lead id' }, { status: 400 });
  }

  const lead = await getLeadById(id);
  if (!lead) {
    return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: lead });
}

export async function PATCH(req: NextRequest) {
  const auth = await isAuthenticatedAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = parseInt(String(body?.id || '0'), 10);
  if (!id) {
    return NextResponse.json({ success: false, message: 'Missing lead id' }, { status: 400 });
  }

  const allowedStatuses = ['new', 'contacted', 'enrolled', 'not_interested', 'invalid'];
  const status =
    body?.status && allowedStatuses.includes(body.status)
      ? (body.status as LeadRecord['status'])
      : undefined;
  const notes = typeof body?.notes === 'string' ? body.notes : undefined;

  const ok = await updateLeadById(id, { status, notes });
  if (!ok) {
    return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

