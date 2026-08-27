import { describe, expect, it } from "vitest";
import { getZaloPayCopyActions } from "./payment-copy-actions.js";

describe("getZaloPayCopyActions", () => {
  it("hiển thị hai thao tác sao chép khi QR ZaloPay sẵn sàng", () => {
    expect(getZaloPayCopyActions({
      paymentMethod: "zalopay",
      hasReadyQr: true,
      orderNumber: "NXR-ZP-001",
      accountNumber: "0123 456 789",
    })).toEqual({
      visible: true,
      transferContent: "NXR-ZP-001",
      accountNumber: "0123456789",
      canCopyTransferContent: true,
      canCopyAccountNumber: true,
    });
  });

  it("ẩn thao tác ngoài ZaloPay hoặc khi QR chưa sẵn sàng", () => {
    expect(getZaloPayCopyActions({
      paymentMethod: "vietqr",
      hasReadyQr: true,
      orderNumber: "NXR-VQ-001",
      accountNumber: "0123456789",
    }).visible).toBe(false);

    expect(getZaloPayCopyActions({
      paymentMethod: "zalopay",
      hasReadyQr: false,
      orderNumber: "NXR-ZP-002",
      accountNumber: "0123456789",
    }).canCopyTransferContent).toBe(false);
  });

  it("giữ nút số tài khoản bị vô hiệu khi shop chưa cấu hình số nhận tiền", () => {
    const result = getZaloPayCopyActions({
      paymentMethod: "zalopay",
      hasReadyQr: true,
      orderNumber: "NXR-ZP-003",
      accountNumber: "",
    });

    expect(result.visible).toBe(true);
    expect(result.canCopyAccountNumber).toBe(false);
  });
});
