import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Internal account UI modules must never be served as public URLs.
  if (pathname === '/components/accounts' || pathname.startsWith('/components/accounts/')) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/components/accounts/:path*'],
};
