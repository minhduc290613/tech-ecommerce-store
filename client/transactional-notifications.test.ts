import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../supabase-unified.sql", import.meta.url), "utf8");
const admin = readFileSync(new URL("./admin-transactional-notifications.js", import.meta.url), "utf8");
const account = readFileSync(new URL("./account-center.js", import.meta.url), "utf8");

describe("thông báo email giao dịch", () => {
  it("duy trì hàng đợi, mẫu hủy/trả/giao và chế độ tắt an toàn", () => {
    expect(schema).toContain("transactional_email_templates");
    expect(schema).toContain("customer_notifications");
    expect(schema).toContain("transactional_mode in ('disabled','api','smtp')");
    expect(schema).toContain("'paid_cancellation_status'");
    expect(schema).toContain("'return_status'");
    expect(schema).toContain("'order_delivered'");
  });

  it("có workspace Admin chỉnh kênh và ba mẫu thông báo", () => {
    expect(admin).toContain("API email giao dịch (Resend)");
    expect(admin).toContain("SMTP tên miền");
    expect(admin).toContain("paid_cancellation_status");
    expect(admin).toContain("order_delivered");
    expect(admin).toContain("Settings → Secrets");
  });

  it("thêm mục thông báo owner-only trong Account Center", () => {
    expect(account).toContain('data-account-tab="notifications"');
    expect(account).toContain('from("customer_notifications")');
    expect(account).toContain("markNotificationsRead");
  });
});
