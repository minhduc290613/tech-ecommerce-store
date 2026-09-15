import { describe, expect, it, afterEach } from "vitest";
import { getPayOSConfig, getPayOSStatus } from "./payos-payments";

describe("PayOS server integration", () => {
  const original = { client: process.env.PAYOS_CLIENT_ID, api: process.env.PAYOS_API_KEY, checksum: process.env.PAYOS_CHECKSUM_KEY, url: process.env.SUPABASE_URL, service: process.env.SUPABASE_SERVICE_ROLE_KEY };
  afterEach(() => {
    for (const [key, value] of Object.entries({ PAYOS_CLIENT_ID: original.client, PAYOS_API_KEY: original.api, PAYOS_CHECKSUM_KEY: original.checksum, SUPABASE_URL: original.url, SUPABASE_SERVICE_ROLE_KEY: original.service })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it("does not report server readiness when any secret is missing", () => {
    process.env.PAYOS_CLIENT_ID = "client";
    process.env.PAYOS_API_KEY = "api";
    delete process.env.PAYOS_CHECKSUM_KEY;
    expect(getPayOSConfig()).toBeNull();
    expect(getPayOSStatus().serverReady).toBe(false);
  });

  it("requires all PayOS and Supabase server credentials", () => {
    process.env.PAYOS_CLIENT_ID = "client";
    process.env.PAYOS_API_KEY = "api";
    process.env.PAYOS_CHECKSUM_KEY = "checksum";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    expect(getPayOSConfig()).toEqual({ clientId: "client", apiKey: "api", checksumKey: "checksum" });
    expect(getPayOSStatus().serverReady).toBe(true);
  });
});
