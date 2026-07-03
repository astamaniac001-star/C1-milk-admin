import { createHash } from "crypto";

// ── SECURE ENVIRONMENT VARIABLES ────────────────────────────────────────────
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APP_SECRET = process.env.APP_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://c1milk.vercel.app";

// ── HELPERS ─────────────────────────────────────────────────────────────────
const buildCorsHeaders = (origin) => {
  const allow = ALLOWED_ORIGIN ? ALLOWED_ORIGIN.replace(/\/$/, "") : origin || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

const jsonResponse = (statusCode, headers, payload) => ({
  statusCode,
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const errorResponse = (statusCode, headers, code, message) =>
  jsonResponse(statusCode, headers, {
    success: false,
    error: { code, message },
  });

// Vercel provides IP in different headers depending on the edge node
const getClientIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  if (req.headers["x-real-ip"]) return req.headers["x-real-ip"];
  if (req.ip) return req.ip;
  return "unknown";
};

const hashIP = (ip) => createHash("sha256").update(ip).digest("hex").slice(0, 16);

// ── VALIDATION HELPERS (Preserved exactly from Netlify) ─────────────────────
const checkEnvironment = (corsHeaders) => {
  if (!APPS_SCRIPT_URL || !APP_SECRET) {
    return errorResponse(503, corsHeaders, "PROXY_MISCONFIGURED", "Proxy is missing required environment variables");
  }
  return null;
};

const checkMethod = (req, corsHeaders) => {
  if (req.method === "OPTIONS") return { preflight: true };
  if (req.method !== "POST") return errorResponse(405, corsHeaders, "METHOD_NOT_ALLOWED", "Only POST is accepted");
  return null;
};

export const checkOrigin = (req, corsHeaders) => {
  const origin = (req.headers.origin || req.headers.Origin || "").replace(/\/$/, "");
  if (ALLOWED_ORIGIN && origin.toLowerCase() !== ALLOWED_ORIGIN.replace(/\/$/, "").toLowerCase()) {
    return errorResponse(403, corsHeaders, "FORBIDDEN", "Origin not allowed");
  }
  return null;
};

const checkBodySize = (req, corsHeaders) => {
  // Vercel parses JSON automatically, so we stringify to check byte length
  const bodyStr = typeof req.body === "string" ? req.body : JSON.stringify(req.body || "");
  if (Buffer.byteLength(bodyStr, "utf8") > 102400) {
    return errorResponse(413, corsHeaders, "PAYLOAD_TOO_LARGE", "Request body exceeds 100 KB");
  }
  return null;
};

export const parseAndValidateBody = (req, corsHeaders) => {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {
      return errorResponse(400, corsHeaders, "BAD_REQUEST", "Invalid JSON");
    }
  }
  if (!body || !body.action || typeof body.action !== "string") {
    return errorResponse(400, corsHeaders, "BAD_REQUEST", "action field is required");
  }
  return { body };
};

// ── VALIDATION ──────────────────────────────────────────────────────────────
export function validateRequest(req, corsHeaders) {
  return (
    checkEnvironment(corsHeaders) ||
    checkMethod(req, corsHeaders) ||
    checkOrigin(req, corsHeaders) ||
    checkBodySize(req, corsHeaders) ||
    parseAndValidateBody(req, corsHeaders)
  );
}

// ── UPSTREAM CALL (Preserved exactly from Netlify) ──────────────────────────
async function callAppsScript(body) {
  console.warn("[proxy] Calling upstream with action:", body.action);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000), // 8-second timeout to prevent hanging
      redirect: "follow",
    });
    const text = await response.text();
    console.warn("[proxy] Final status:", response.status, "| Length:", text.length);
    return { ok: true, status: response.status, text };
  } catch (err) {
    console.error("[proxy] Upstream call failed:", err.name, err.message);
    return { ok: false, error: err };
  }
}

// ── RESPONSE HANDLER (Preserved exactly from Netlify) ───────────────────────
export function handleUpstreamResponse(result, corsHeaders) {
  if (!result.ok) {
    const isTimeout = result.error?.name === "TimeoutError" || result.error?.name === "AbortError";
    return errorResponse(
      isTimeout ? 504 : 502,
      corsHeaders,
      isTimeout ? "GATEWAY_TIMEOUT" : "UPSTREAM_ERROR",
      result.error?.message || "Upstream error"
    );
  }

  let finalBody = result.text;
  try {
    JSON.parse(finalBody);
  } catch {
    console.error("[proxy] Upstream returned non-JSON:", finalBody.substring(0, 200));
    finalBody = JSON.stringify({
      success: false,
      error: { code: "UPSTREAM_NON_JSON", message: "Upstream returned a non-JSON response. Check Vercel logs." },
    });
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: finalBody,
  };
}

// ── MAIN HANDLER (Adapted for Vercel's req/res signature) ───────────────────
export default async function handler(req, res) {
  const origin = (req.headers.origin || req.headers.Origin || "").replace(/\/$/, "");
  const corsHeaders = buildCorsHeaders(origin);

  // Apply CORS headers to the Vercel response object
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }

  const validation = validateRequest(req, corsHeaders);
  
  if (validation.preflight) return res.status(204).end();
  if (validation.statusCode) {
    res.status(validation.statusCode);
    for (const [key, value] of Object.entries(validation.headers)) res.setHeader(key, value);
    return res.send(validation.body);
  }

  const body = validation.body;
  body.appSecret = APP_SECRET;
  body.ipHash = hashIP(getClientIP(req));

  const result = await callAppsScript(body);
  const upstreamResponse = handleUpstreamResponse(result, corsHeaders);

  res.status(upstreamResponse.statusCode);
  for (const [key, value] of Object.entries(upstreamResponse.headers)) res.setHeader(key, value);
  return res.send(upstreamResponse.body);
}