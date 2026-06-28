

import { createHash } from 'crypto';

// ── SECURE ENVIRONMENT VARIABLES ────────────────────────────────────────────
// Your secrets are NOT hardcoded here. They are securely stored in your 
// Netlify Dashboard and injected at runtime. This keeps your GitHub repo safe.
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APP_SECRET      = process.env.APP_SECRET;
const ALLOWED_ORIGIN  = process.env.ALLOWED_ORIGIN || "https://c1milk.netlify.app";

// ── HELPERS ─────────────────────────────────────────────────────────────────
const buildCorsHeaders = (origin) => {
  const allow = ALLOWED_ORIGIN ? ALLOWED_ORIGIN.replace(/\/$/, '') : (origin || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

const jsonResponse = (statusCode, headers, payload) => ({
  statusCode,
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const errorResponse = (statusCode, headers, code, message) => 
  jsonResponse(statusCode, headers, { success: false, error: { code, message } });

const getClientIP = (event) => 
  event.headers['x-nf-client-connection-ip'] || 
  (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
  'unknown';

const hashIP = (ip) => createHash('sha256').update(ip).digest('hex').slice(0, 16);

// ── VALIDATION (Simplified for lower cyclomatic complexity) ─────────────────
function validateRequest(event, corsHeaders) {
  // 1. Method check
  if (event.httpMethod === 'OPTIONS') return { preflight: true };
  if (event.httpMethod !== 'POST') return errorResponse(405, corsHeaders, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');

  // 2. Origin check
  const origin = (event.headers['origin'] || event.headers['Origin'] || '').replace(/\/$/, '');
  if (ALLOWED_ORIGIN && origin.toLowerCase() !== ALLOWED_ORIGIN.replace(/\/$/, '').toLowerCase()) {
    return errorResponse(403, corsHeaders, 'FORBIDDEN', 'Origin not allowed');
  }

  // 3. Body size check
  const bodyStr = event.body || '';
  if (Buffer.byteLength(bodyStr, 'utf8') > 102400) {
    return errorResponse(413, corsHeaders, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 100 KB');
  }

  // 4. JSON parse check
  let body;
  try {
    body = JSON.parse(bodyStr);
  } catch {
    return errorResponse(400, corsHeaders, 'BAD_REQUEST', 'Invalid JSON');
  }
  if (!body.action || typeof body.action !== 'string') {
    return errorResponse(400, corsHeaders, 'BAD_REQUEST', 'action field is required');
  }

  // 5. Environment check
  if (!APPS_SCRIPT_URL || !APP_SECRET) {
    return errorResponse(503, corsHeaders, 'PROXY_MISCONFIGURED', 'Proxy is missing required environment variables');
  }

  return { body };
}

// ── UPSTREAM CALL (Fixed for Google Apps Script 302 redirects) ──────────────
async function callAppsScript(body) {
  console.log('[proxy] Calling upstream with action:', body.action);
  
  try {
    // CRITICAL FIX: 'text/plain' and 'redirect: follow' mimics browser behavior
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, 
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      redirect: 'follow', // Let Node.js handle the 302 automatically!
    });
    
    const text = await response.text();
    console.log('[proxy] Final status:', response.status, '| Length:', text.length);
    
    return { ok: true, status: response.status, text };
  } catch (err) {
    console.error('[proxy] Upstream call failed:', err.name, err.message);
    return { ok: false, error: err };
  }
}

// ── MAIN HANDLER ────────────────────────────────────────────────────────────
export const handler = async function (event) {
  const origin = (event.headers['origin'] || event.headers['Origin'] || '').replace(/\/$/, '');
  const corsHeaders = buildCorsHeaders(origin);

  // 1. Validate
  const validation = validateRequest(event, corsHeaders);
  if (validation.preflight) return { statusCode: 204, headers: corsHeaders, body: '' };
  if (validation.statusCode) return validation; // It's an error response

  // 2. Augment body
  const body = validation.body;
  body.appSecret = APP_SECRET;
  body.ipHash = hashIP(getClientIP(event));

  // 3. Call upstream
  const result = await callAppsScript(body);

  // 4. Handle upstream response
  if (!result.ok) {
    const isTimeout = result.error?.name === 'TimeoutError' || result.error?.name === 'AbortError';
    return errorResponse(
      isTimeout ? 504 : 502, 
      corsHeaders, 
      isTimeout ? 'GATEWAY_TIMEOUT' : 'UPSTREAM_ERROR', 
      result.error?.message || 'Upstream error'
    );
  }

  // 5. Sanitize and return
  let finalBody = result.text;
  try {
    JSON.parse(finalBody); // Verify it's valid JSON
  } catch {
    console.error('[proxy] Upstream returned non-JSON:', finalBody.substring(0, 200));
    finalBody = JSON.stringify({
      success: false,
      error: { code: 'UPSTREAM_NON_JSON', message: 'Upstream returned a non-JSON response. Check Netlify logs.' },
    });
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: finalBody,
  };
};