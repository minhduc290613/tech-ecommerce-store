import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("admin archive order operations", () => {
  it("dùng hộp xác nhận có lý do thay cho prompt và confirm trình duyệt khi hủy/lưu trữ", () => {
    const source = projectFile("client/admin.js");
    expect(source).toContain("mountOrderActionConfirmation");
    expect(source).toContain("id=\"orderActionConfirmReason\"");
    expect(source).toContain("submitOrderActionConfirmation");
    expect(source).not.toContain("window.prompt(`Lý do hủy đơn");
    expect(source).not.toContain("window.confirm(`Xóa đơn");
  });

  it("có lối lọc đơn đã hủy và lịch sử archive chỉ dành cho Admin", () => {
    const source = projectFile("client/admin.js");
    const styles = projectFile("client/admin-order-archive.css");
    expect(source).toContain('id="focusCancelledOrders"');
    expect(source).toContain('state.paymentFilter = "cancelled"');
    expect(source).toContain('id="archivedOrderHistory"');
    expect(source).toContain('.not("archived_at", "is", null)');
    expect(source).toContain("panel.hidden = !state.isAdmin");
    expect(styles).toContain("@media (max-width: 720px)");
  });
});
