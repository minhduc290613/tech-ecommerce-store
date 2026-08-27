import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

describe("Liên kết nhanh ở chân trang", () => {
  it("gom Dashboard Affiliate, Đơn hàng của tôi và Quản trị cửa hàng trong cùng một mục", () => {
    const quickLinks = html.match(/<div class="footer-column footer-quick-links">([\s\S]*?)<\/div>/)?.[1] || "";
    expect(quickLinks).toContain('href="/affiliate.html"');
    expect(quickLinks).toContain('href="/orders.html"');
    expect(quickLinks).toContain('href="/admin.html"');
  });
});
