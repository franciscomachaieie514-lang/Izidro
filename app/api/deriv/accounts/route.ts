import { NextRequest, NextResponse } from 'next/server';
import { resolveDerivToken } from '../../../../lib/platform-auth';
import { fetchDerivJson, getDerivError, isDerivTimeout } from '../../../../lib/deriv-api';

export const dynamic = 'force-dynamic';
const API_BASE = 'https://api.derivws.com';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveDerivToken(request);
    if (!resolved) return NextResponse.json({ error: 'Deriv account not connected' }, { status: 401 });

    // OAuth2 Bearer tokens identify the registered app; Deriv-App-ID is for PAT authentication.
    const headers: Record<string, string> = {
      Authorization: `Bearer ${resolved.accessToken}`,
    };

    const upstream = await fetchDerivJson(`${API_BASE}/trading/v1/options/accounts`, { headers });
    if (!upstream.validJson) {
      console.error('Deriv accounts returned a non-JSON response', {
        status: upstream.response.status,
        contentType: upstream.contentType,
      });
      return NextResponse.json(
        { error: 'A Deriv API devolveu uma resposta inválida. Tente novamente.', code: 'DERIV_INVALID_UPSTREAM_RESPONSE' },
        { status: 502 },
      );
    }

    const data = upstream.data as any;
    if (!upstream.response.ok) {
      const detail = getDerivError(data);
      console.error('Deriv accounts request failed', {
        status: upstream.response.status,
        code: detail.code || 'UPSTREAM_ERROR',
        message: detail.message || 'No JSON error message',
      });
      const upstreamUnavailable = upstream.response.status >= 500;
      const tokenExpired = upstream.response.status === 401;
      return NextResponse.json(
        {
          error: tokenExpired ? 'A sessão Deriv expirou. Volte a ligar a sua conta.' : (detail.message || 'Deriv accounts request failed'),
          code: tokenExpired ? 'DERIV_TOKEN_EXPIRED' : (upstreamUnavailable ? 'DERIV_UPSTREAM_BUSY' : (detail.code || 'DERIV_REQUEST_FAILED')),
          retryAfterSeconds: upstreamUnavailable ? 30 : undefined,
        },
        {
          status: upstream.response.status === 503 ? 503 : (upstreamUnavailable ? 502 : upstream.response.status),
          headers: upstreamUnavailable ? { 'Retry-After': '30', 'Cache-Control': 'no-store' } : { 'Cache-Control': 'no-store' },
        },
      );
    }

    const raw = Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : [];
    const accounts = raw.map((account: any) => ({
      account_id: account.account_id,
      account_type: account.account_type,
      balance: account.balance,
      currency: account.currency,
      status: account.status,
      group: account.group,
    }));
    return NextResponse.json(
      { accounts },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } },
    );
  } catch (error) {
    if (isDerivTimeout(error)) {
      console.error('Deriv accounts request timed out');
      return NextResponse.json({ error: 'A Deriv demorou demasiado a responder. Tente novamente.', code: 'DERIV_TIMEOUT' }, { status: 504 });
    }
    console.error('Deriv accounts error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to load Deriv accounts', code: 'DERIV_UPSTREAM_UNAVAILABLE' }, { status: 502 });
  }
}
