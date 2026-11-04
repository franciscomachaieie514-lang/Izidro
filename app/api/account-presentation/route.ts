import { NextRequest, NextResponse } from 'next/server';
import { getSession, PLATFORM_SESSION_COOKIE } from '../../../lib/platform-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Account-label authorization and label selection are evaluated only on the server.
const PRESENTATION_INVERSION_USERS = new Set([
  'esmazita@gmail.com',
  'terioqueiroz@gmail.com',
]);

const LABELS = {
  en: { real: 'Real', demo: 'Demo' },
  pt: { real: 'Real', demo: 'Demo' },
  es: { real: 'Real', demo: 'Demo' },
} as const;

type Language = keyof typeof LABELS;

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value;
    const user = await getSession(sessionId);
    if (!user?.email) {
      return NextResponse.json(
        { labels: LABELS.en },
        { status: 401, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
      );
    }

    const requestedLanguage = request.nextUrl.searchParams.get('lang') || 'en';
    const language: Language = requestedLanguage in LABELS
      ? requestedLanguage as Language
      : 'en';
    const baseLabels = LABELS[language];
    const isAuthorized = PRESENTATION_INVERSION_USERS.has(
      String(user.email).trim().toLowerCase()
    );

    // Only the final display strings leave the server; no email, allowlist, or rule is exposed.
    const labels = isAuthorized
      ? { real: baseLabels.demo, demo: baseLabels.real }
      : baseLabels;

    return NextResponse.json(
      { labels },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          Vary: 'Cookie',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { labels: LABELS.en },
      { status: 503, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
    );
  }
}
