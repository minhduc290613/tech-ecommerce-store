import { describe, expect, it } from "vitest";
import { getAutoTransferPresentation, normalizeAutoTransferSettings, paymentMethodLabel } from "./auto-transfer-payment.js";

describe("cấu hình CK tự động", () => {
  it("chỉ sẵn sàng khi bật phương thức và có đủ thông tin tài khoản nhận", () => {
    const ready = getAutoTransferPresentation({ payment_auto_transfer_enabled: true, payment_auto_transfer_provider: "sepay", payment_bank_id: "MB", payment_account_number: "0123", payment_account_name: "NEXORA" });
    const incomplete = getAutoTransferPresentation({ payment_auto_transfer_enabled: true, payment_auto_transfer_provider: "sepay", payment_bank_id: "MB" });
    expect(ready.ready).toBe(true);
    expect(incomplete.ready).toBe(false);
  });

  it("dùng SePay an toàn khi provider trong settings không hợp lệ", () => {
    expect(normalizeAutoTransferSettings({ payment_auto_transfer_provider: "unknown" }).provider).toBe("sepay");
  });

  it("hiển thị rõ nhà cung cấp trong nhãn phương thức", () => {
    expect(paymentMethodLabel("auto_transfer", "casso")).toBe("CK tự động · Casso");
  });
});
