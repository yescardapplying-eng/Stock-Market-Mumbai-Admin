import crypto from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'smm_admin_session';

function getSecret(): string {
  return process.env.AUTH_SECRET || 'SMM_Session_HMAC_Secret_2026_Change_In_Prod';
}

export function getExpectedCredentials() {
  return {
    username: (process.env.ADMIN_USERNAME || 'Nagma').trim(),
    password: (process.env.ADMIN_PASSWORD || 'Meraj2003k@#').trim(),
  };
}

export function createSessionToken(username: string): string {
  const payload = JSON.stringify({
    u: username,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): { valid: boolean; username?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return { valid: false };

  const expectedSig = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      u: string;
      exp: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) {
      return { valid: false };
    }
    return { valid: true, username: parsed.u };
  } catch {
    return { valid: false };
  }
}

export async function isAuthenticatedAdmin(): Promise<{ authenticated: boolean; username?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const result = verifySessionToken(token);
  return { authenticated: result.valid, username: result.username };
}

