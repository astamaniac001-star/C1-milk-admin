

/**
 * ============================================================================
 * MILK DELIVERY ADMIN — V17
 * netlify/functions/proxy.js
 * ============================================================================
 *
 * This Netlify serverless function is the ONLY thing the browser ever talks
 * to. It:
 *   1. Validates the request origin against ALLOWED_ORIGIN
 *   2. Injects APP_SECRET (never exposed to the browser) into the body
 *   3. Hashes the client IP (never logs raw IPs)
 *   4. Forwards to the Apps Script Web App URL
 *   5. Returns the response to the browser with CORS headers
 *
 * Required environment variables (set in Netlify → Site → Environment vars):
 *   APPS_SCRIPT_URL   — your deployed Apps Script /exec URL
 *   APP_SECRET        — must match APP_SECRET in Apps Script Properties
 *   ALLOWED_ORIGIN    — your frontend URL, e.g. https://your-site.netlify.app
 *
 * Deploy path: netlify/functions/proxy.js
 * ============================================================================
 */

import { createHash } from 'crypto';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APP_SECRET      = process.env.APP_SECRET;
const ALLOWED_ORIGIN  = process.env.ALLOWED_ORIGIN;

// Warn loudly at cold-start if misconfigured — these will appear in Netlify
// function logs (Functions → proxy → Recent invocations).
if (!APPS_SCRIPT_URL) console.error('[V17 proxy] APPS_SCRIPT_URL env var missing — all requests will fail');
if (!APP_SECRET)      console.error('[V17 proxy] APP_SECRET env var missing — all requests will fail');
if (!ALLOWED_ORIGIN)  console.warn('[V17 proxy] ALLOWED_ORIGIN not set — accepting all origins (not safe for production)');

// ── CORS headers ─────────────────────────────────────────────────────────────
// These are set by the proxy, never by Apps Script (Rule 1 from Part 4).
function buildCorsHeaders(requestOrigin) {
  const allow = ALLOWED_ORIGIN
    ? ALLOWED_ORIGIN.replace(/\/$/, '')
    : (requestOrigin || '*');

  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  };
}

// ── IP helpers ────────────────────────────────────────────────────────────────
function getClientIP(event) {
  return (
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

// Issue 2 fix: SHA-256 of the IP — 16 hex chars (64 bits) is non-reversible
// in practice. We never store or log raw IPs; only this token goes to Apps
// Script. No salt needed here: the security goal is rate-limiting, not user
// anonymity. If you later want full anonymity, add a random SALT env var.
function hashIP(ip) {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// ── Apps Script call ──────────────────────────────────────────────────────────
// Issues 1 + 3 + 4 + 6 fixed together:
//   - 8 s timeout fits inside Netlify's 10 s wall clock (Issue 1)
//   - no retry on network/timeout errors (Issue 1)
//   - redirect: 'manual' + explicit POST on the Location header (Issue 4)
//   - body drained before 5xx retry (Issue 3)
//   - inline AbortSignal.timeout — Node 18+ always has it (Issue 6)
async function callAppsScript(body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await fetch(APPS_SCRIPT_URL, {
        method:   'POST',
        headers:  { 'Content-Type': 'application/json' },
        body:     JSON.stringify(body),
        signal:   AbortSignal.timeout(8000),  // 8 s: leaves headroom for Netlify's 10 s default
        redirect: 'manual',                   // never let fetch change our method silently
      });
    } catch (err) {
      // Network / timeout errors never retry — Netlify may have killed us already
      return { ok: false, error: err };
    }

    // Issue 4 fix: manually follow redirect with POST preserved.
    // GAS normally uses 307 (which preserves method) but guard 301/302/308 too.
    const loc = response.headers.get('location');
    if ((response.status === 301 || response.status === 302 ||
         response.status === 307 || response.status === 308) && loc) {
      try {
        response = await fetch(loc, {
          method:   'POST',                    // always POST, even for 302 — we know GAS wants POST
          headers:  { 'Content-Type': 'application/json' },
          body:     JSON.stringify(body),
          signal:   AbortSignal.timeout(6000),
          redirect: 'error',                   // no further redirects
        });
      } catch (err) {
        return { ok: false, error: err };
      }
    }

    // Issue 3 fix: drain body before retry so the TCP connection is released
    if (response.status >= 500 && attempt === 0) {
      await response.text().catch(() => {});
      console.warn('[V17 proxy] Upstream returned', response.status, '— retrying once');
      continue;
    }

    const text = await response.text();
    return { ok: true, status: response.status, text };
  }
  return { ok: false, error: new Error('Upstream returned 5xx on both attempts') };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async function (event) {
  const origin = (event.headers['origin'] || event.headers['Origin'] || '').replace(/\/$/, '');
  const corsHeaders = buildCorsHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is accepted' } }),
    };
  }

  // Origin check
  if (ALLOWED_ORIGIN) {
    const norm = ALLOWED_ORIGIN.replace(/\/$/, '');
    if (origin.toLowerCase() !== norm.toLowerCase()) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Origin not allowed' } }),
      };
    }
  }

  // Body size check (100 KB hard limit)
  const bodyStr = event.body || '';
  if (Buffer.byteLength(bodyStr, 'utf8') > 102400) {
    return {
      statusCode: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 100 KB' } }),
    };
  }

  // Parse JSON
  let body;
  try {
    body = JSON.parse(bodyStr);
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }),
    };
  }

  // Validate action field exists (quick cheap check before hitting Apps Script)
  if (!body.action || typeof body.action !== 'string') {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'action field is required' } }),
    };
  }

  // Sanity checks on env vars
  if (!APPS_SCRIPT_URL || !APP_SECRET) {
    return {
      statusCode: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code: 'PROXY_MISCONFIGURED', message: 'Proxy is missing required environment variables' } }),
    };
  }

  // Inject server-side values — the browser never sees APP_SECRET
  body.appSecret = APP_SECRET;
  body.ipHash    = hashIP(getClientIP(event));

  // Forward to Apps Script
  const result = await callAppsScript(body);

  if (!result.ok) {
    const err = result.error;
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    const status    = isTimeout ? 504 : 502;
    const code      = isTimeout ? 'GATEWAY_TIMEOUT' : 'UPSTREAM_ERROR';
    console.error('[V17 proxy] Upstream call failed:', err?.name, err?.message);
    return {
      statusCode: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code, message: err?.message || 'Upstream error' } }),
    };
  }

  if (result.status !== 200) {
    console.warn('[V17 proxy] Upstream non-200:', result.status, result.text?.substring(0, 200));
  }

  // Issue 5 fix: validate the upstream body is actual JSON before returning
  // it as application/json. GAS may return an HTML error page on cold-start
  // failures; passing that through makes the client's apiCall() throw a
  // cryptic SyntaxError instead of surfacing a clean message.
  let responseBody = result.text;
  try {
    JSON.parse(result.text);
  } catch {
    console.error('[V17 proxy] Upstream returned non-JSON body:', result.text.substring(0, 200));
    responseBody = JSON.stringify({
      success: false,
      error: { code: 'UPSTREAM_NON_JSON', message: 'Upstream returned a non-JSON response. Check Netlify logs.' },
    });
  }

  // Pass the response straight through — Apps Script owns the JSON shape
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type':  'application/json',
      'Cache-Control': 'no-store',
    },
    body: responseBody,
  };
};