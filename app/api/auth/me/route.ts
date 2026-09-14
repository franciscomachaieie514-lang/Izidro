import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasDerivAccount, PLATFORM_SESSION_COOKIE } from '../../../../lib/platform-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ authenticated:false }, { status:401 });
  return NextResponse.json({ authenticated:true, user, derivConnected:await hasDerivAccount(user.id) });
}
