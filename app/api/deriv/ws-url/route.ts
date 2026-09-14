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

    const response = await fetch(`${API_BASE}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.access_token}` },
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok || !data?.data?.url) {
      return NextResponse.json({ error: 'Unable to create Deriv WebSocket session', details: data }, { status: response.status || 502 });
    }
    return NextResponse.json({ url: data.data.url });
  } catch (error) {
    console.error('Deriv ws-url error:', error);
    return NextResponse.json({ error: 'Unable to create Deriv WebSocket session' }, { status: 500 });
  }
}
