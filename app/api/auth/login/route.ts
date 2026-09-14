import { NextRequest, NextResponse } from 'next/server';
import { generateCodeChallenge, generateCodeVerifier, generateState, getAuthorizeUrl } from '../../../../lib/oauth';
import { getSession, PLATFORM_SESSION_COOKIE } from '../../../../lib/platform-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
  const baseUrl = process.env.APP_URL?.trim() || request.nextUrl.origin;
  const callback = `${baseUrl.replace(/\/$/,'')}/api/auth/callback`;
  if (!session) return NextResponse.redirect(`${baseUrl}/?auth_error=platform_account_required`);
  const clientId = (process.env.DERIV_CLIENT_ID || process.env.DERIV_APP_ID || '').trim();
  if (!clientId) return NextResponse.json({ error:'DERIV_CLIENT_ID não está configurado.' }, { status:500 });
  const verifier = generateCodeVerifier();
  const state = generateState();
  const challenge = generateCodeChallenge(verifier);
  const response = NextResponse.redirect(getAuthorizeUrl(clientId,callback,challenge,state));
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set('oauth_verifier',verifier,{ httpOnly:true, secure, sameSite:'lax', path:'/', maxAge:600 });
  response.cookies.set('oauth_state',state,{ httpOnly:true, secure, sameSite:'lax', path:'/', maxAge:600 });
  response.cookies.set('oauth_redirect_uri',callback,{ httpOnly:true, secure, sameSite:'lax', path:'/', maxAge:600 });
  return response;
}
