import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification center", () => {
  it("có nút bell và badge cạnh Đơn hàng", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(html).toContain('id="notificationButton"');
    expect(html).toContain('id="notificationBadge"');
    expect(html).toContain('id="ordersNotificationBadge"');
    expect(html).toContain('src="/notification-center.js"');
  });

  it("đọc dữ liệu qua RPC owner-scoped và đánh dấu riêng từng nguồn", () => {
    const source = readFileSync(resolve(process.cwd(), "client/notification-center.js"), "utf8");
    expect(source).toContain('db.rpc("get_my_notifications"');
    expect(source).toContain('"mark_platform_notification_read"');
    expect(source).toContain('"mark_customer_notification_read"');
    expect(source).toContain('const count = unreadCount()');
  });
});

describe("admin platform notifications", () => {
  it("chỉ khởi tạo cho Admin hoặc MKT và có xác nhận broadcast", () => {
    const source = readFileSync(resolve(process.cwd(), "client/admin-platform-notifications.js"), "utf8");
    const schema = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    expect(source).toContain('detail.role !== "marketing"');
    expect(source).toContain("window.confirm");
    expect(source).toContain('db.rpc("publish_platform_notification"');
    expect(schema).toContain("if not public.is_admin() and not public.has_role('marketing')");
    expect(schema).toContain("grant execute on function public.publish_platform_notification");
  });
});
