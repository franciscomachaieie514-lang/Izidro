import { NextRequest, NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge, generateState, getAuthorizeUrl } from '../../../../lib/oauth';
import { getSession, PLATFORM_SESSION_COOKIE } from '../../../../lib/platform-auth';

function getPublicAppUrl(request: NextRequest) {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
  return (configured || request.nextUrl.origin).replace(/\/$/, '');
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const platformSession = await getSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
  const clientId = (process.env.DERIV_APP_ID || process.env.DERIV_CLIENT_ID || '').trim();
  if (!clientId) {
    return NextResponse.json({ error: 'OAuth server configuration is incomplete: DERIV_APP_ID is missing' }, { status: 500 });
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();
  const redirectUri = `${getPublicAppUrl(request)}/api/auth/callback`;

  const response = NextResponse.redirect(getAuthorizeUrl(clientId, redirectUri, challenge, state), { status: 302 });
  response.cookies.set('oauth_verifier', verifier, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  response.cookies.set('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  response.cookies.set('oauth_redirect_uri', redirectUri, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
