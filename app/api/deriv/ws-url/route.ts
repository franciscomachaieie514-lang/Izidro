import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDerivAccount, PLATFORM_SESSION_COOKIE } from '../../../../lib/platform-auth';

export const dynamic = 'force-dynamic';
const API_BASE = 'https://api.derivws.com';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const accountId = request.nextUrl.searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id is required' }, { status: 400 });

    const account = await getDerivAccount(user.id);
    if (!account?.access_token) return NextResponse.json({ error: 'Deriv account not connected' }, { status: 404 });

    const headers: Record<string,string> = {
      Authorization: `Bearer ${account.access_token}`,
      'Content-Type': 'application/json'
    };
    // OAuth tokens already identify the app; PAT authentication additionally
    // requires Deriv-App-ID. Include it whenever configured for compatibility.
    const appId = (process.env.DERIV_APP_ID || process.env.DERIV_CLIENT_ID || '').trim();
    if (appId) headers['Deriv-App-ID'] = appId;

    const response = await fetch(`${API_BASE}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`, {
      method: 'POST',
      headers,
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok || !data?.data?.url) {
      return NextResponse.json({ error: 'Unable to create Deriv WebSocket session', details: data }, { status: response.status || 502 });
    }

    // Keep both shapes for compatibility with the restored dashboard scripts.
    // Deriv returns the authenticated URL at data.url; the frontend accepts either url or data.url.
    return NextResponse.json({ url: data.data.url, data: { url: data.data.url } });
  } catch (error) {
    console.error('Deriv ws-url error:', error);
    return NextResponse.json({ error: 'Unable to create Deriv WebSocket session' }, { status: 500 });
  }
}
