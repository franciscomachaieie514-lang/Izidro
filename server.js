const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 10000);
const APP_ID = String(process.env.DERIV_APP_ID || '').trim();
const BASE_URL = String(process.env.NEXT_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
const REDIRECT_URI = String(process.env.REDIRECT_URL || '').trim();
const AUTHORIZE_URL = 'https://auth.deriv.com/oauth2/auth';
const TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const OAUTH_TTL = 10 * 60 * 1000;

const oauthStates = new Map();
const sessions = new Map();

function configError() {
  const missing = [];
  if (!APP_ID) missing.push('DERIV_APP_ID');
  if (!BASE_URL) missing.push('NEXT_PUBLIC_BASE_URL');
  if (!REDIRECT_URI) missing.push('REDIRECT_URL');
  return missing;
}
function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('base64url'); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('base64url'); }
function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`];
  if (options.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  if (options.secure !== false) parts.push('Secure');
  return parts.join('; ');
}
function json(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}
function redirect(res, location, headers = {}) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store', ...headers });
  res.end();
}
async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: APP_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(`OAuth token exchange failed (${response.status}): ${data?.error_description || data?.error || 'unknown error'}`);
  }
  return data;
}
function sessionFromRequest(req) {
  const id = parseCookies(req.headers.cookie || '')['__Host-izitrader_session'];
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) { sessions.delete(id); return null; }
  return { id, ...session };
}
function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.ico':'image/x-icon' })[ext] || 'application/octet-stream';
}
function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(__dirname, relative);
  if (!file.startsWith(path.resolve(__dirname) + path.sep)) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': pathname === '/' ? 'no-cache' : 'public, max-age=300' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const missing = configError();

    if (url.pathname === '/api/auth/login' && req.method === 'GET') {
      if (missing.length) return json(res, 500, { error: 'OAuth server configuration is incomplete', missing });
      const verifier = randomToken(32);
      const challenge = sha256(verifier);
      const state = randomToken(24);
      oauthStates.set(state, { verifier, createdAt: Date.now() });
      const auth = new URL(AUTHORIZE_URL);
      auth.searchParams.set('response_type', 'code');
      auth.searchParams.set('client_id', APP_ID);
      auth.searchParams.set('redirect_uri', REDIRECT_URI);
      auth.searchParams.set('scope', 'trade');
      auth.searchParams.set('state', state);
      auth.searchParams.set('code_challenge', challenge);
      auth.searchParams.set('code_challenge_method', 'S256');
      return redirect(res, auth.toString());
    }

    if (url.pathname === '/api/auth/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const oauthError = url.searchParams.get('error');
      if (oauthError) return redirect(res, `/?auth_error=${encodeURIComponent(oauthError)}`);
      const pending = state && oauthStates.get(state);
      if (!code || !pending || Date.now() - pending.createdAt > OAUTH_TTL) return json(res, 400, { error: 'Invalid or expired OAuth state' });
      oauthStates.delete(state);
      const token = await exchangeCode(code, pending.verifier);
      const sessionId = randomToken(32);
      sessions.set(sessionId, { accessToken: token.access_token, refreshToken: token.refresh_token || null, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL });
      return redirect(res, '/', { 'Set-Cookie': cookie('__Host-izitrader_session', sessionId, { maxAge: SESSION_TTL / 1000 }) });
    }

    if (url.pathname === '/api/auth/session' && req.method === 'GET') {
      const session = sessionFromRequest(req);
      return json(res, 200, session ? { authenticated: true, expiresAt: session.expiresAt } : { authenticated: false });
    }

    if (url.pathname === '/api/auth/logout' && (req.method === 'GET' || req.method === 'POST')) {
      const session = sessionFromRequest(req);
      if (session) sessions.delete(session.id);
      return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('__Host-izitrader_session', '', { maxAge: 0 }) });
    }

    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, oauth: true, configured: missing.length === 0, missing });
    }
    return serveStatic(req, res);
  } catch (error) {
    console.error('[Izitrader OAuth]', error);
    return json(res, 500, { error: 'Internal server error' });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [state, item] of oauthStates) if (now - item.createdAt > OAUTH_TTL) oauthStates.delete(state);
  for (const [id, session] of sessions) if (session.expiresAt < now) sessions.delete(id);
}, 60_000).unref();

server.listen(PORT, '0.0.0.0', () => console.log(`[Izitrader] listening on ${PORT}; OAuth redirect: ${REDIRECT_URI || '(not configured)'}`));
