import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  getExpectedCredentials,
  SESSION_COOKIE_NAME,
} from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '').trim();

  const expected = getExpectedCredentials();
  if (username !== expected.username || password !== expected.password) {
    return NextResponse.json(
      { success: false, message: 'Invalid username or password.' },
      { status: 401 }
    );
  }

  const token = createSessionToken(username);
  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' || req.url.startsWith('https://');
  const res = NextResponse.json({ success: true, username });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
