import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("English Command Deck entrypoint", () => {
  it("ships an English admin page with the shared admin runtime", () => {
    expect(existsSync(resolve(projectRoot, "client/admin-en.html"))).toBe(true);
    const html = readProjectFile("client/admin-en.html");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('data-admin-language="en"');
    expect(html).toContain('src="/admin.js"');
    expect(html).toContain('src="/admin-i18n.js"');
  });

  it("keeps the English presentation layer focused on admin-owned UI text", () => {
    const i18n = readProjectFile("client/admin-i18n.js");
    expect(i18n).toContain('"Tổng quan": "Overview"');
    expect(i18n).toContain('"Quản lý đơn hàng & giao nhận": "Order & fulfillment management"');
    expect(i18n).toContain("MutationObserver");
    expect(i18n).toContain('document.body?.dataset.adminLanguage !== "en"');
  });

  it("registers admin-en.html as a Vite production entrypoint", () => {
    const viteConfig = readProjectFile("vite.config.ts");
    expect(viteConfig).toContain('adminEnglish: path.resolve(import.meta.dirname, "client", "admin-en.html")');
  });
});
