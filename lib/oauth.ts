import { randomBytes, createHash } from 'crypto';

const DERIV_OAUTH_AUTHORIZE = 'https://auth.deriv.com/oauth2/auth';
const DERIV_OAUTH_TOKEN = 'https://auth.deriv.com/oauth2/token';

export function generateCodeVerifier() { return randomBytes(32).toString('base64url'); }
export function generateCodeChallenge(verifier: string) { return createHash('sha256').update(verifier).digest('base64url'); }
export function generateState() { return randomBytes(16).toString('hex'); }

export function getAuthorizeUrl(clientId: string, redirectUri: string, challenge: string, state: string) {
  const params = new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
    scope: 'trade', state, code_challenge: challenge, code_challenge_method: 'S256'
  });
  return `${DERIV_OAUTH_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeCode(clientId: string, redirectUri: string, code: string, codeVerifier: string) {
  const params = new URLSearchParams({ grant_type:'authorization_code', client_id:clientId, code, redirect_uri:redirectUri, code_verifier:codeVerifier });
  const response = await fetch(DERIV_OAUTH_TOKEN, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:params.toString(), cache:'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || data?.error || 'OAuth token exchange failed');
  return { access_token:data.access_token as string, refresh_token:data.refresh_token as string|undefined, expires_in:data.expires_in as number|undefined };
}
