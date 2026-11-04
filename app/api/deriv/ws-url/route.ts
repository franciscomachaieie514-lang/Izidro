import { NextRequest, NextResponse } from 'next/server';
import { resolveDerivToken } from '../../../../lib/platform-auth';
import { fetchDerivJson, getDerivError, isDerivTimeout } from '../../../../lib/deriv-api';

export const dynamic = 'force-dynamic';
const API_BASE = 'https://api.derivws.com';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('account_id');
    const resolved = await resolveDerivToken(request);
    if (!resolved) return NextResponse.json({ error: 'Deriv account not connected' }, { status: 401 });
    if (!accountId || !/^[A-Za-z0-9_-]{3,40}$/.test(accountId)) {
      return NextResponse.json({ error: 'A valid account_id is required' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${resolved.accessToken}`,
      'Content-Type': 'application/json',
    };
    const appId = (process.env.DERIV_APP_ID || process.env.DERIV_CLIENT_ID || '').trim();
    if (appId) headers['Deriv-App-ID'] = appId;

    const upstream = await fetchDerivJson(
      `${API_BASE}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
      { method: 'POST', headers },
    );
    if (!upstream.validJson) {
      console.error('Deriv ws-url returned a non-JSON response', {
        status: upstream.response.status,
        contentType: upstream.contentType,
      });
      return NextResponse.json(
        { error: 'A Deriv API devolveu uma resposta inválida. Tente novamente.', code: 'DERIV_INVALID_UPSTREAM_RESPONSE' },
        { status: 502 },
      );
    }

    const data = upstream.data as any;
    if (!upstream.response.ok || !data?.data?.url) {
      const detail = getDerivError(data);
      console.error('Deriv ws-url request failed', {
        status: upstream.response.status,
        code: detail.code || 'UPSTREAM_ERROR',
        message: detail.message || 'WebSocket URL missing',
      });
      return NextResponse.json(
        { error: detail.message || 'Unable to create Deriv WebSocket session', code: detail.code || 'DERIV_WS_SESSION_FAILED' },
        { status: upstream.response.status >= 500 ? 502 : (upstream.response.status || 502) },
      );
    }

    return NextResponse.json(
      { url: data.data.url, data: { url: data.data.url } },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } },
    );
  } catch (error) {
    if (isDerivTimeout(error)) {
      console.error('Deriv ws-url request timed out');
      return NextResponse.json({ error: 'A Deriv demorou demasiado a responder. Tente novamente.', code: 'DERIV_TIMEOUT' }, { status: 504 });
    }
    console.error('Deriv ws-url error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to create Deriv WebSocket session', code: 'DERIV_UPSTREAM_UNAVAILABLE' }, { status: 502 });
  }
}
