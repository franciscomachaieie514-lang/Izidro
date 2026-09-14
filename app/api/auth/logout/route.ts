import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, PLATFORM_SESSION_COOKIE } from '@/lib/platform-auth';

export async function POST(request: NextRequest) {
  await deleteSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok:true });
  response.cookies.delete(PLATFORM_SESSION_COOKIE);
  return response;
}
