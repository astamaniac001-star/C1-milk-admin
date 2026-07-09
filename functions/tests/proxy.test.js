// tests/api.test.js
import { describe, it, expect, vi } from "vitest";
import { onRequestPost, onRequestOptions } from "../api.js";

// Mock environment variables
const mockEnv = {
  APPS_SCRIPT_URL: "https://example.com",
  APP_SECRET: "secret",
  ALLOWED_ORIGIN: "https://app.example.com",
};

const createMockContext = (
  method,
  headers = {},
  body = null,
  env = mockEnv,
) => {
  const request = new Request("https://example.com/api", {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  return {
    request,
    env,
    functionPath: "/api",
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
  };
};

describe("Cloudflare Pages API Proxy", () => {
  it("handles OPTIONS preflight requests correctly", async () => {
    const context = createMockContext("OPTIONS", {
      Origin: "https://app.example.com",
    });
    const response = await onRequestOptions(context);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.example.com",
    );
  });

  it("rejects requests with an invalid origin", async () => {
    const context = createMockContext(
      "POST",
      { Origin: "https://evil.example.com" },
      { action: "ping" },
    );
    const response = await onRequestPost(context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe("FORBIDDEN");
  });

  it("accepts valid requests from the configured origin", async () => {
    // Mock fetch to prevent actual upstream call
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { pong: true } }), {
        status: 200,
      }),
    );

    const context = createMockContext(
      "POST",
      { Origin: "https://app.example.com" },
      { action: "ping" },
    );
    const response = await onRequestPost(context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("rejects requests missing the action field", async () => {
    const context = createMockContext(
      "POST",
      { Origin: "https://app.example.com" },
      { payload: "no action" },
    );
    const response = await onRequestPost(context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("BAD_REQUEST");
  });

  it("returns 503 if environment variables are missing", async () => {
    const emptyEnv = {
      APPS_SCRIPT_URL: "",
      APP_SECRET: "",
      ALLOWED_ORIGIN: "*",
    };
    const context = createMockContext(
      "POST",
      { Origin: "https://app.example.com" },
      { action: "ping" },
      emptyEnv,
    );
    const response = await onRequestPost(context);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error.code).toBe("PROXY_MISCONFIGURED");
  });

  it("rejects payloads larger than 100KB", async () => {
    const largePayload = { action: "ping", data: "a".repeat(102401) };
    const context = createMockContext(
      "POST",
      { Origin: "https://app.example.com" },
      largePayload,
    );
    const response = await onRequestPost(context);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
