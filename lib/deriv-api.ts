/**
 * Defensive JSON transport for the Deriv REST API.
 * Deriv may return HTML from an edge/proxy failure; do not let that become
 * an unhandled JSON SyntaxError or echo a raw HTML page to the client.
 */
export interface DerivJsonResponse {
  response: Response;
  data: unknown;
  validJson: boolean;
  contentType: string;
}

export async function fetchDerivJson(
  url: string,
  init: RequestInit,
  timeoutMs = 12000,
): Promise<DerivJsonResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || 'unknown';
    const body = await response.text();
    try {
      return { response, data: body ? JSON.parse(body) : {}, validJson: true, contentType };
    } catch {
      return { response, data: null, validJson: false, contentType };
    }
  } finally {
    clearTimeout(timeout);
  }
}

export function getDerivError(data: unknown): { code?: string; message?: string } {
  if (!data || typeof data !== 'object') return {};
  const root = data as { errors?: unknown; error?: unknown };
  const first = Array.isArray(root.errors) ? root.errors[0] : root.error;
  if (!first || typeof first !== 'object') return {};
  const item = first as { code?: unknown; message?: unknown };
  return {
    code: typeof item.code === 'string' ? item.code.slice(0, 80) : undefined,
    message: typeof item.message === 'string' ? item.message.slice(0, 240) : undefined,
  };
}

export function isDerivTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}
