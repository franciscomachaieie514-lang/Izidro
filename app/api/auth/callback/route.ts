import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '../../../lib/oauth';
import { getSession, PLATFORM_SESSION_COOKIE, saveDerivAccount } from '../../../lib/platform-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
  const baseUrl = process.env.APP_URL?.trim() || request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  if (!session) return NextResponse.redirect(`${baseUrl}/?auth_error=platform_account_required`);
  if (error) return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(params.get('error_description') || error)}`);
  if (!code || !state) return NextResponse.redirect(`${baseUrl}/?auth_error=missing_oauth_parameters`);
  if (state !== request.cookies.get('oauth_state')?.value) return NextResponse.redirect(`${baseUrl}/?auth_error=invalid_oauth_state`);
  const verifier = request.cookies.get('oauth_verifier')?.value;
  const redirectUri = request.cookies.get('oauth_redirect_uri')?.value;
  const clientId = (process.env.DERIV_CLIENT_ID || process.env.DERIV_APP_ID || '').trim();
  if (!verifier || !redirectUri || !clientId) return NextResponse.redirect(`${baseUrl}/?auth_error=oauth_configuration_missing`);
  try {
    const token = await exchangeCode(clientId,redirectUri,code,verifier);
    await saveDerivAccount(session.id,token.access_token,token.refresh_token,token.expires_in);
    const response = NextResponse.redirect(`${baseUrl}/?deriv_connected=1`);
    response.cookies.delete('oauth_verifier');
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_redirect_uri');
    return response;
  } catch (err) {
    console.error('[Izidro] Deriv OAuth callback failed',err);
    return NextResponse.redirect(`${baseUrl}/?auth_error=oauth_exchange_failed`);
  }
}
