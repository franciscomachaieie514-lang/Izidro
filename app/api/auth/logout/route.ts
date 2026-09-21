import { NextRequest, NextResponse } from 'next/server';
import {
  deleteSession,
  PLATFORM_SESSION_COOKIE,
  GUEST_ACCESS_COOKIE,
  GUEST_REFRESH_COOKIE,
} from '../../../../lib/platform-auth';

export async function POST(request: NextRequest) {
  await deleteSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(PLATFORM_SESSION_COOKIE);
  response.cookies.delete(GUEST_ACCESS_COOKIE);
  response.cookies.delete(GUEST_REFRESH_COOKIE);

  return response;
}
