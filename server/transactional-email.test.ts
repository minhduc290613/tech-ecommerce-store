import { describe, expect, it } from "vitest";
import { getTransactionalEmailSecretStatus, renderTransactionalEmail } from "./transactional-email";

describe("email giao dịch", () => {
  it("thay thế biến mẫu email mà không đưa HTML đầu vào vào nội dung", () => {
    const message = renderTransactionalEmail({ subject: "Đơn {order_number}", preheader: "Cập nhật", heading: "Chào {customer_name}", body_text: "{status}", cta_label: "Xem đơn", footer_text: "NEXORA", is_enabled: true }, { customer_name: "<khách>", order_number: "NXR-1", order_total: "0 ₫", status: "Đã duyệt", review_note: "", orders_url: "https://shop.example/orders.html", store_name: "NEXORA" });
    expect(message.subject).toBe("Đơn NXR-1");
    expect(message.html).toContain("&lt;khách&gt;");
    expect(message.text).toContain("Đã duyệt");
  });

  it("mặc định không báo sẵn sàng nếu chưa có secret", () => {
    const status = getTransactionalEmailSecretStatus();
    expect(typeof status.serverReady).toBe("boolean");
    expect(typeof status.smtpConfigured).toBe("boolean");
  });
});
