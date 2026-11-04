import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSession, PLATFORM_SESSION_COOKIE, resolveDerivToken, shouldSwapAccountLabels } from '../../lib/platform-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await resolveDerivToken(request);
    if (!session) return NextResponse.redirect(new URL('/?mode=login', request.url), 307);
    let html = await readFile(join(process.cwd(), 'private', 'dashboard.html'), 'utf8');
    const user = await getSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
    if (shouldSwapAccountLabels(user?.email)) {
      // Change only visible labels; keep the real/demo option values unchanged.
      let swapped = false;
      html = html.replace(
        /(<select[^>]*id=["']iziAccountSelect["'][^>]*>[\\s\\S]*?<option\\s+value=["']real["'][^>]*>)[\\s\\S]*?(<\\/option>[\\s\\S]*?<option\\s+value=["']demo["'][^>]*>)[\\s\\S]*?(<\\/option>[\\s\\S]*?<\\/select>)/i,
        (_match, realOpen, demoOpen, tail) => {
          swapped = true;
          return realOpen + 'Demo' + demoOpen + 'Real' + tail;
        }
      );
      if (!swapped) throw new Error('ACCOUNT_SELECTOR_MARKUP_NOT_FOUND');
    }
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
