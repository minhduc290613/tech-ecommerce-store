import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(projectRoot, file), "utf8");

describe("Mantis Admin variant", () => {
  it("has an independent entrypoint and responsive stylesheet", () => {
    expect(existsSync(resolve(projectRoot, "client/admin-mantis.html"))).toBe(true);
    expect(existsSync(resolve(projectRoot, "client/admin-mantis.css"))).toBe(true);
    expect(existsSync(resolve(projectRoot, "client/admin-mantis.js"))).toBe(true);
    const html = read("client/admin-mantis.html");
    expect(html).toContain('id="mantisApp"');
    expect(html).toContain('href="/admin-en.html"');
    expect(html).toContain('href="/admin.html"');
    expect(html).toContain('href="/admin-mantis.css"');
    expect(html).toContain('data-mantis-view="products"');
    expect(html).toContain('data-mantis-view="users"');
    expect(html).toContain('id="mantisRevenueChart"');
    expect(html).toContain('id="mantisLatestOrders"');
    expect(html).toContain('id="mantisLanguageToggle"');
    expect(html).toContain('id="mantisThemeToggle"');
  });

  it("uses the shared public Supabase config and protected authorization RPCs", () => {
    const script = read("client/admin-mantis.js");
    expect(script).toContain('from "./supabase-config.js"');
    expect(script).toContain('rpc("can_access_command_deck")');
    expect(script).toContain('rpc("is_admin")');
    expect(script).toContain("signInWithPassword");
    expect(script).toContain("signOut");
    expect(script).not.toContain("service_role");
    expect(script).toContain('localStorage.getItem("nexora-mantis-language")');
    expect(script).toContain('localStorage.getItem("nexora-mantis-theme")');
    expect(script).toContain('customer_profiles');
    expect(script).toContain('mantisRevenueChart');
    expect(script).toContain('mantisLatestOrders');
  });

  it("registers the separate page in the production multipage build", () => {
    expect(read("vite.config.ts")).toContain('adminMantis: path.resolve(import.meta.dirname, "client", "admin-mantis.html")');
  });
});
