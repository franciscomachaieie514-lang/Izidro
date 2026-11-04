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
      // Swap visible labels only; option values remain bound to real/demo accounts.
      const selectorStart = html.indexOf('<select class="account-select" id="iziAccountSelect">');
      const selectorEnd = selectorStart >= 0 ? html.indexOf('</select>', selectorStart) : -1;
      if (selectorStart < 0 || selectorEnd < 0) throw new Error('ACCOUNT_SELECTOR_MARKUP_NOT_FOUND');
      const selector = html.slice(selectorStart, selectorEnd + '</select>'.length)
        .replace('<option value="real">Real</option>', '<option value="real">Demo</option>')
        .replace('<option value="demo">Demo</option>', '<option value="demo">Real</option>');
      html = html.slice(0, selectorStart) + selector + html.slice(selectorEnd + '</select>'.length);
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
