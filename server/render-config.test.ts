import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("Render production configuration", () => {
  it("defines a Node web service with pnpm build/start and health check", () => {
    const render = fs.readFileSync(path.join(root, "render.yaml"), "utf8");
    expect(render).toContain("type: web");
    expect(render).toContain("pnpm install --frozen-lockfile && pnpm build");
    expect(render).toContain("startCommand: pnpm start");
    expect(render).toContain("healthCheckPath: /healthz");
    expect(render).toContain("key: JWT_SECRET\n        generateValue: true");
  });

  it("keeps Supabase browser configuration on public Vite variables only", () => {
    const config = fs.readFileSync(path.join(root, "client/supabase-config.js"), "utf8");
    expect(config).toContain("VITE_SUPABASE_URL");
    expect(config).toContain("VITE_SUPABASE_ANON_KEY");
    expect(config).not.toContain("SERVICE_ROLE");
  });

  it("registers the Render health endpoint before application routes", () => {
    const server = fs.readFileSync(path.join(root, "server/_core/index.ts"), "utf8");
    expect(server).toContain('app.get("/healthz"');
    expect(server).toContain('process.env.PORT || "3000"');
  });
});
