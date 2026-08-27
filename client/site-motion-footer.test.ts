import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("./admin.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./site-motion-footer.css", import.meta.url), "utf8");

describe("footer settings and safe storefront motion", () => {
  it("tách lối vào đơn hàng và quản trị thành hai nhóm footer riêng", () => {
    expect(html).toContain('class="footer-column footer-quick-links"');
    expect(html).toContain('class="footer-column footer-support"');
    expect(html).toContain('href="/affiliate.html"');
    expect(html).toContain('href="/orders.html"');
    expect(html).toContain('href="/admin.html"');
  });

  it("đồng bộ credit và trạng thái website từ site settings", () => {
    expect(html).toContain('id="footerCredit"');
    expect(html).toContain('id="footerSiteStatus"');
    expect(app).toContain("footer_credit_text");
    expect(app).toContain("footer_status_online === false");
    expect(admin).toContain("settingFooterCredit");
    expect(admin).toContain("settingFooterStatusOnline");
  });

  it("chỉ chạy animation khi người dùng không yêu cầu giảm chuyển động", () => {
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@keyframes nexora-reveal");
  });
});
