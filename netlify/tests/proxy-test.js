import { describe, it, expect, vi } from "vitest";

async function loadProxyModule() {
  vi.resetModules();
  process.env.APPS_SCRIPT_URL = "https://example.com";
  process.env.APP_SECRET = "secret";
  process.env.ALLOWED_ORIGIN = "https://app.example.com";
  return import("./proxy.js");
}

describe("proxy request validation", () => {
  it("accepts valid requests from the configured origin", async () => {
    const { validateRequest } = await loadProxyModule();
    const corsHeaders = { "Access-Control-Allow-Origin": "https://app.example.com" };
    const result = validateRequest(
      {
        httpMethod: "POST",
        headers: { origin: "https://app.example.com" },
        body: JSON.stringify({ action: "ping" }),
      },
      corsHeaders,
    );

    expect(result.ok).toBe(true);
    expect(result.body.action).toBe("ping");
  });

  it("rejects requests with an invalid origin", async () => {
    const { validateRequest } = await loadProxyModule();
    const result = validateRequest(
      {
        httpMethod: "POST",
        headers: { origin: "https://evil.example.com" },
        body: JSON.stringify({ action: "ping" }),
      },
      {},
    );

    expect(result.ok).toBe(false);
    expect(result.response.statusCode).toBe(403);
  });

  it("returns a preflight success object for OPTIONS requests", async () => {
    const { validateRequest } = await loadProxyModule();
    const result = validateRequest({ httpMethod: "OPTIONS", headers: {} }, {});

    expect(result.ok).toBe(true);
    expect(result.preflight).toBe(true);
  });
});
