import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveDerivToken } from '../../lib/platform-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await resolveDerivToken(request);
    if (!session) return NextResponse.redirect(new URL('/?mode=login', request.url), 307);
    const html = await readFile(join(process.cwd(), 'private', 'dashboard.html'), 'utf8');
    return new NextResponse(html, { status: 200, headers: {
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'private, no-store, max-age=0',
      'Vary':'Cookie',
      'X-Content-Type-Options':'nosniff',
      'X-Frame-Options':'SAMEORIGIN',
      'Referrer-Policy':'same-origin',
    }});
  } catch (error) {
    console.error('Protected dashboard error:', error instanceof Error ? error.message : 'unknown');
    return new NextResponse('Dashboard temporarily unavailable.', {status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
  }
}
