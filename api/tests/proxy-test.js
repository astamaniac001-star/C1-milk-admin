
/* global process */
import { describe, it, expect } from "vitest";

// 1. Set environment variables BEFORE the static import
process.env.APPS_SCRIPT_URL = "https://example.com";
process.env.APP_SECRET = "secret";
process.env.ALLOWED_ORIGIN = "https://app.example.com";

// 2. STATIC IMPORTS (Points to the new Vercel api folder)
import {
  validateRequest,
  handler,
  checkOrigin,
  parseAndValidateBody,
  handleUpstreamResponse,
} from "../api/proxy.js";

describe("proxy request validation", () => {
  it("accepts valid requests from the configured origin", () => {
    const corsHeaders = { "Access-Control-Allow-Origin": "https://app.example.com" };
    const result = validateRequest(
      {
        method: "POST", // Changed from httpMethod to match Vercel's req object
        headers: { origin: "https://app.example.com" },
        body: JSON.stringify({ action: "ping" }),
      },
      corsHeaders,
    );

    expect(result.statusCode).toBeUndefined();
    expect(result.body.action).toBe("ping");
  });

  it("rejects requests with an invalid origin", () => {
    const result = validateRequest(
      {
        method: "POST", // Changed from httpMethod
        headers: { origin: "https://evil.example.com" },
        body: JSON.stringify({ action: "ping" }),
      },
      {},
    );
    expect(result.statusCode).toBe(403);
  });

  it("returns a preflight success object for OPTIONS requests", () => {
    const result = validateRequest({ method: "OPTIONS", headers: {} }, {}); // Changed from httpMethod
    expect(result.preflight).toBe(true);
  });

  it("exposes helper functions for coverage tracking", () => {
    expect(typeof checkOrigin).toBe("function");
    expect(typeof parseAndValidateBody).toBe("function");
    expect(typeof handleUpstreamResponse).toBe("function");
    expect(typeof handler).toBe("function");
  });
});