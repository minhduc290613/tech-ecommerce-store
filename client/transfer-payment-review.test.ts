import { describe, expect, it } from "vitest";
import { canAdminConfirmPayment, getManualTransferReviewQueue } from "./transfer-payment-review.js";

describe("transfer payment review", () => {
  it("chỉ đưa chuyển khoản đang chờ vào queue và ưu tiên khách đã gửi yêu cầu Zalo", () => {
    const queue = getManualTransferReviewQueue([
      { id: "wallet", status: "pending_payment", payment_method: "wallet", created_at: "2026-08-20T10:00:00Z" },
      { id: "old", status: "pending_payment", payment_method: "vietqr", created_at: "2026-08-20T10:00:00Z" },
      { id: "requested", status: "pending_payment", payment_method: "momo", zalo_confirmation_requested_at: "2026-08-20T11:00:00Z", created_at: "2026-08-20T11:00:00Z" },
      { id: "paid", status: "paid", payment_method: "vietqr", created_at: "2026-08-20T09:00:00Z" },
    ]);
    expect(queue.map((order) => order.id)).toEqual(["requested", "old"]);
  });

  it("không cho xác nhận thủ công đơn ví hoặc đơn đã thanh toán", () => {
    expect(canAdminConfirmPayment({ status: "pending_payment", payment_method: "wallet" })).toBe(false);
    expect(canAdminConfirmPayment({ status: "paid", payment_method: "vietqr" })).toBe(false);
    expect(canAdminConfirmPayment({ status: "pending_payment", payment_method: "zalopay" })).toBe(true);
  });
});
