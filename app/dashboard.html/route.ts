import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getSession,
  PLATFORM_SESSION_COOKIE,
  resolveDerivToken,
} from '../../lib/platform-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Account-specific display rules are evaluated only on the server.
const ALTERNATE_DISPLAY_USERS = new Set([
  'esmazita@gmail.com',
  'terioqueiroz@gmail.com',
]);

function applyAccountDisplay(html: string, alternate: boolean) {
  if (!alternate) return html;

  const realOption = '<option value="real">Real</option>';
  const demoOption = '<option value="demo">Demo</option>';

  // Change visible text only. Underlying option values remain real/demo.
  if (!html.includes(realOption) || !html.includes(demoOption)) return html;

  return html
    .replace(realOption, '<option value="real">Demo</option>')
    .replace(demoOption, '<option value="demo">Real</option>');
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveDerivToken(request);
    if (!session) {
      return NextResponse.redirect(new URL('/?mode=login', request.url), 307);
    }

    const sessionId = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value;
    const user = await getSession(sessionId);
    const useAlternateDisplay = Boolean(
      user?.email && ALTERNATE_DISPLAY_USERS.has(String(user.email).trim().toLowerCase())
    );

    const sourceHtml = await readFile(join(process.cwd(), 'private', 'dashboard.html'), 'utf8');
    const html = applyAccountDisplay(sourceHtml, useAlternateDisplay);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store, max-age=0',
        'Vary': 'Cookie',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'same-origin',
      },
    });
  } catch (error) {
    console.error('Protected dashboard error:', error instanceof Error ? error.message : 'unknown');
    return new NextResponse('Dashboard temporarily unavailable.', {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
