import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("orders navigation", () => {
  it("đặt liên kết Đơn hàng ở header desktop, menu mobile và footer", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(html).toContain('class="profile-button orders-shortcut" href="/orders.html"');
    expect(html).toContain('<a href="/orders.html"><i class="fa-solid fa-box-open" aria-hidden="true"></i> Đơn hàng của tôi</a>');
    expect(html.indexOf('class="profile-button orders-shortcut"')).toBeLessThan(html.indexOf('id="authButton"'));
  });
});
