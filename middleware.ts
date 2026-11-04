import { NextRequest, NextResponse } from 'next/server';

const PRIVATE_BROWSER_FILES = new Set([
  '/dashboard.html',
  '/auth.js',
  '/language-symbols-fix.js',
  '/live-analysis.js',
  '/deriv-realtime.js',
]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Internal account UI modules must never be served as public URLs.
  if (pathname === '/components/accounts' || pathname.startsWith('/components/accounts/')) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  // The dashboard and its browser-side modules are private. Validate the
  // same HttpOnly session/guest cookies used by /api/auth/me before serving.
  if (PRIVATE_BROWSER_FILES.has(pathname)) {
    try {
      const authUrl = new URL('/api/auth/me', request.nextUrl.origin);
      const authResponse = await fetch(authUrl, {
        method: 'GET',
        headers: { cookie: request.headers.get('cookie') ?? '' },
        cache: 'no-store',
      });

      if (!authResponse.ok) {
        const loginUrl = new URL('/', request.url);
        loginUrl.searchParams.set('mode', 'login');
        return NextResponse.redirect(loginUrl);
      }

      const auth = await authResponse.json();
      if (auth?.authenticated !== true) {
        const loginUrl = new URL('/', request.url);
        loginUrl.searchParams.set('mode', 'login');
        return NextResponse.redirect(loginUrl);
      }

      const response = NextResponse.next();
      response.headers.set('Cache-Control', 'private, no-store, max-age=0');
      response.headers.set('Vary', 'Cookie');
      return response;
    } catch {
      // Fail closed: never expose private dashboard files if auth cannot be checked.
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('mode', 'login');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/components/accounts/:path*',
    '/dashboard.html',
    '/auth.js',
    '/language-symbols-fix.js',
    '/live-analysis.js',
    '/deriv-realtime.js',
  ],
};
