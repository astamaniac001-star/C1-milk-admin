
import { createHash } from 'crypto';

// ── SECURE ENVIRONMENT VARIABLES ────────────────────────────────────────────
// Your secrets are NOT hardcoded here. They are securely stored in your 
// Netlify Dashboard and injected at runtime. This keeps your GitHub repo safe.
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APP_SECRET      = process.env.APP_SECRET;
const ALLOWED_ORIGIN  = process.env.ALLOWED_ORIGIN || "https://c1milk.netlify.app";

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

function jsonResponse(statusCode, corsHeaders, payload) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function errorResponse(statusCode, corsHeaders, code, message) {
  return jsonResponse(statusCode, corsHeaders, { success: false, error: { code, message } });
}

function getClientIP(event) {
  return (
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

function hashIP(ip) {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function isRedirectStatus(status) {
  return status === 301 || status === 302 || status === 307 || status === 308;
}

async function postToAppsScript(url, body, timeoutMs, manualRedirect = false) {
  return fetch(url, {
    method:   'POST',
    headers:  { 'Content-Type': 'application/json' },
    body:     JSON.stringify(body),
    signal:   AbortSignal.timeout(timeoutMs),
    redirect: manualRedirect ? 'manual' : 'error',
  });
}

async function followRedirect(location, body) {
  let currentUrl = location;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await postToAppsScript(currentUrl, body, 6000, true);
      if (!isRedirectStatus(response.status)) {
        return { ok: true, response };
      }
      const nextLoc = response.headers.get('location');
      if (!nextLoc) return { ok: false, error: new Error('Redirect missing Location header') };
      currentUrl = new URL(nextLoc, currentUrl).toString();
      await response.text().catch(() => {});
    } catch (err) {
      return { ok: false, error: err };
    }
  }
  return { ok: false, error: new Error('Too many redirects from upstream') };
}

async function _handleRedirect(response, body) {
  const loc = response.headers.get('location');
  if (isRedirectStatus(response.status) && loc) {
    const redirect = await followRedirect(loc, body);
    if (!redirect.ok) return redirect;
    return { ok: true, response: redirect.response };
  }
  return { ok: true, response };
}

function _shouldRetry(response, attempt) {
  return response.status >= 500 && attempt === 0;
}

async function attemptUpstreamCall(body, attempt) {
  try {
    const response = await postToAppsScript(APPS_SCRIPT_URL, body, 8000, true);
    console.log('[proxy] Attempt', attempt + 1, 'status:', response.status);
    return { ok: true, response };
  } catch (err) {
    console.error('[proxy] Attempt', attempt + 1, 'failed:', err.name, err.message);
    return { ok: false, error: err };
  }
}

async function handleResponseWithRedirect(response, body) {
  const redirectResult = await _handleRedirect(response, body);
  if (!redirectResult.ok) {
    console.error('[proxy] Redirect handling failed:', redirectResult.error?.message);
    return redirectResult;
  }
  return redirectResult;
}

async function extractResponseText(response) {
  const text = await response.text();
  console.log('[proxy] Upstream response length:', text.length, 'chars');
  return text;
}

async function callAppsScript(body) {
  console.log('[proxy] Calling upstream with action:', body.action);
  for (let attempt = 0; attempt < 2; attempt++) {
    const callResult = await attemptUpstreamCall(body, attempt);
    if (!callResult.ok) return callResult;

    const redirectResult = await handleResponseWithRedirect(callResult.response, body);
    if (!redirectResult.ok) return redirectResult;

    const response = redirectResult.response;

    if (_shouldRetry(response, attempt)) {
      await response.text().catch(() => {});
      console.warn('[proxy] Upstream returned', response.status, '— retrying once');
      continue;
    }

    const text = await extractResponseText(response);
    return { ok: true, status: response.status, text };
  }
  console.error('[proxy] Both attempts failed');
  return { ok: false, error: new Error('Upstream returned 5xx on both attempts') };
}

function parseRequestBody(bodyStr) {
  try {
    return { ok: true, body: JSON.parse(bodyStr) };
  } catch {
    return { ok: false };
  }
}

function validateOrigin(origin) {
  if (!ALLOWED_ORIGIN) return true;
  const norm = ALLOWED_ORIGIN.replace(/\/$/, '');
  return origin.toLowerCase() === norm.toLowerCase();
}

function _validateMethod(event, corsHeaders) {
  if (event.httpMethod === 'OPTIONS') {
    return { ok: true, preflight: true };
  }
  if (event.httpMethod !== 'POST') {
    return { ok: false, response: errorResponse(405, corsHeaders, 'METHOD_NOT_ALLOWED', 'Only POST is accepted') };
  }
  return { ok: true };
}

function _validateOrigin(event, corsHeaders) {
  const origin = (event.headers['origin'] || event.headers['Origin'] || '').replace(/\/$/, '');
  if (!validateOrigin(origin)) {
    return { ok: false, response: errorResponse(403, corsHeaders, 'FORBIDDEN', 'Origin not allowed') };
  }
  return { ok: true };
}

function _validateBodySize(event, corsHeaders) {
  const bodyStr = event.body || '';
  if (Buffer.byteLength(bodyStr, 'utf8') > 102400) {
    return { ok: false, response: errorResponse(413, corsHeaders, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 100 KB') };
  }
  return { ok: true, bodyStr };
}

function _validateBodyStructure(bodyStr, corsHeaders) {
  const parsed = parseRequestBody(bodyStr);
  if (!parsed.ok) {
    return { ok: false, response: errorResponse(400, corsHeaders, 'BAD_REQUEST', 'Invalid JSON') };
  }
  if (!parsed.body.action || typeof parsed.body.action !== 'string') {
    return { ok: false, response: errorResponse(400, corsHeaders, 'BAD_REQUEST', 'action field is required') };
  }
  return { ok: true, body: parsed.body };
}

function _validateEnvironment(corsHeaders) {
  if (!APPS_SCRIPT_URL || !APP_SECRET) {
    return { ok: false, response: errorResponse(503, corsHeaders, 'PROXY_MISCONFIGURED', 'Proxy is missing required environment variables') };
  }
  return { ok: true };
}

export function validateRequest(event, corsHeaders) {
  const methodCheck = _validateMethod(event, corsHeaders);
  if (!methodCheck.ok) return methodCheck;
  if (methodCheck.preflight) return methodCheck;

  const originCheck = _validateOrigin(event, corsHeaders);
  if (!originCheck.ok) return originCheck;

  const sizeCheck = _validateBodySize(event, corsHeaders);
  if (!sizeCheck.ok) return sizeCheck;

  const structureCheck = _validateBodyStructure(sizeCheck.bodyStr, corsHeaders);
  if (!structureCheck.ok) return structureCheck;

  const envCheck = _validateEnvironment(corsHeaders);
  if (!envCheck.ok) return envCheck;

  return { ok: true, body: structureCheck.body };
}

function processRequestPipeline(event, corsHeaders) {
  const request = validateRequest(event, corsHeaders);
  if (!request.ok) return request.response || { ok: false, response: request.response };
  if (request.preflight) return { ok: true, preflight: true, response: { statusCode: 204, headers: corsHeaders, body: '' } };
  return { ok: true, body: request.body };
}

async function executeUpstreamCall(body) {
  return callAppsScript(body);
}

function handleUpstreamResponse(result, corsHeaders) {
  if (!result.ok) return upstreamErrorResponse(result, corsHeaders);
  return buildSuccessResponse(result, corsHeaders);
}

function classifyUpstreamError(err) {
  const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
  return {
    isTimeout,
    status: isTimeout ? 504 : 502,
    code: isTimeout ? 'GATEWAY_TIMEOUT' : 'UPSTREAM_ERROR',
  };
}

function upstreamErrorResponse(result, corsHeaders) {
  const err = result.error;
  const classification = classifyUpstreamError(err);
  console.error('[proxy] Upstream call failed:', err?.name, err?.message);
  return errorResponse(classification.status, corsHeaders, classification.code, err?.message || 'Upstream error');
}

function sanitizeUpstreamBody(text) {
  try {
    JSON.parse(text);
    return text;
  } catch {
    console.error('[proxy] Upstream returned non-JSON body:', text.substring(0, 200));
    return JSON.stringify({
      success: false,
      error: { code: 'UPSTREAM_NON_JSON', message: 'Upstream returned a non-JSON response. Check Netlify logs.' },
    });
  }
}

function buildRequestOrigin(event) {
  return (event.headers['origin'] || event.headers['Origin'] || '').replace(/\/$/, '');
}

function augmentRequestBody(body, event) {
  body.appSecret = APP_SECRET;
  body.ipHash = hashIP(getClientIP(event));
  return body;
}

function buildSuccessResponse(result, corsHeaders) {
  if (result.status !== 200) {
    console.warn('[proxy] Upstream non-200:', result.status, result.text?.substring(0, 200));
  }

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type':  'application/json',
      'Cache-Control': 'no-store',
    },
    body: sanitizeUpstreamBody(result.text),
  };
}

export const handler = async function (event) {
  const origin = buildRequestOrigin(event);
  const corsHeaders = buildCorsHeaders(origin);

  const pipeline = processRequestPipeline(event, corsHeaders);
  if (!pipeline.ok) return pipeline.response;
  if (pipeline.preflight) return pipeline.response;

  const body = augmentRequestBody(pipeline.body, event);
  const result = await executeUpstreamCall(body);
  return handleUpstreamResponse(result, corsHeaders);
};