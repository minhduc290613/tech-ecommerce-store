import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexHtml = readFileSync(resolve(import.meta.dirname, "index.html"), "utf8");

describe("storefront quick links", () => {
  it("links to the English Command Deck from the quick links footer", () => {
    expect(indexHtml).toContain('class="footer-column footer-quick-links"');
    expect(indexHtml).toContain('href="/admin-en.html"');
    expect(indexHtml).toContain("English Admin");
  });

  it("keeps the customer and Vietnamese admin links available", () => {
    expect(indexHtml).toContain('href="/orders.html"');
    expect(indexHtml).toContain('href="/admin.html"');
    expect(indexHtml).toContain("Dashboard Affiliate");
  });
});
