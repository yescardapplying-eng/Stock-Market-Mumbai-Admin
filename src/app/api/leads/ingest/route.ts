import { NextRequest, NextResponse } from 'next/server';
import { ingestLead } from '@/lib/admin-db';

function corsHeaders() {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-smm-ingest-secret',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.ADMIN_INGEST_SECRET || 'SMM_Admin_Ingest_2026_Secret_Key';
  const providedSecret = req.headers.get('x-smm-ingest-secret') || '';

  if (providedSecret !== expectedSecret) {
    return NextResponse.json(
      { success: false, message: 'Forbidden: invalid ingest secret' },
      { status: 403, headers: corsHeaders() }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.full_name || !body.mobile_number) {
    return NextResponse.json(
      { success: false, message: 'Missing required lead fields' },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const id = await ingestLead({
      form_type: body.form_type === 'contact' ? 'contact' : 'popup',
      lead_reference:
        String(body.lead_reference || '').trim() ||
        `SMM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: String(body.full_name).trim(),
      mobile_number: String(body.mobile_number).trim(),
      state: body.state ? String(body.state).trim() : null,
      segment: body.segment ? String(body.segment).trim() : null,
      capital_range: body.capital_range ? String(body.capital_range).trim() : null,
      message: body.message ? String(body.message).trim() : null,
      source_page: body.source_page ? String(body.source_page).trim() : '/',
      ip_address: body.ip_address ? String(body.ip_address).trim() : '127.0.0.1',
      user_agent: body.user_agent ? String(body.user_agent).trim() : 'Website Sync',
    });

    return NextResponse.json({ success: true, id }, { status: 201, headers: corsHeaders() });
  } catch (err) {
    console.error('[Admin Ingest] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to ingest lead' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

