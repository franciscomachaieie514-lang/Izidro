import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDerivAccount, PLATFORM_SESSION_COOKIE } from '../../../../lib/platform-auth';

export const dynamic = 'force-dynamic';
const API_BASE = 'https://api.derivws.com';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const account = await getDerivAccount(user.id);
    if (!account?.access_token) return NextResponse.json({ error: 'Deriv account not connected' }, { status: 404 });

    const response = await fetch(`${API_BASE}/trading/v1/options/accounts`, {
      headers: { Authorization: `Bearer ${account.access_token}` },
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: 'Deriv accounts request failed', details: data }, { status: response.status });

    const raw = Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : [];
    const accounts = raw.map((a: any) => ({
      account_id: a.account_id,
      account_type: a.account_type,
      balance: a.balance,
      currency: a.currency,
      status: a.status,
      group: a.group
    }));
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Deriv accounts error:', error);
    return NextResponse.json({ error: 'Unable to load Deriv accounts' }, { status: 500 });
  }
}
