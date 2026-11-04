import { NextRequest, NextResponse } from 'next/server';
import { getSession, PLATFORM_SESSION_COOKIE } from '../../../lib/platform-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Sensitive allowlist stays exclusively on the server. Never return emails or identifiers.
const PRESENTATION_INVERSION_USERS = new Set([
  'esmazita@gmail.com',
  'terioqueiroz@gmail.com',
]);

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value;
    const user = await getSession(sessionId);
    if (!user?.email) {
      return NextResponse.json(
        { inverted: false },
        { status: 401, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
      );
    }

    const inverted = PRESENTATION_INVERSION_USERS.has(String(user.email).trim().toLowerCase());
    return NextResponse.json(
      { inverted },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' } }
    );
  } catch {
    return NextResponse.json(
      { inverted: false },
      { status: 503, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
    );
  }
}
