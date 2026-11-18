import { NextResponse } from 'next/server';
import { isMysqlConfigured } from '@/lib/admin-db';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'stock-market-mumbai-admin',
      storageMode: isMysqlConfigured() ? 'mysql' : 'file',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
