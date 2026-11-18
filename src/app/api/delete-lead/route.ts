import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/admin-auth';
import { deleteLeadById } from '@/lib/admin-db';

export async function DELETE(req: NextRequest) {
  const auth = await isAuthenticatedAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryId = parseInt(searchParams.get('id') || '0', 10);
  const body = await req.json().catch(() => null);
  const id = queryId || parseInt(String(body?.id || '0'), 10);

  if (!id) {
    return NextResponse.json({ success: false, message: 'Missing lead id' }, { status: 400 });
  }

  const ok = await deleteLeadById(id);
  if (!ok) {
    return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

