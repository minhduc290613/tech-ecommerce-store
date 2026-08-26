import { describe, expect, it } from "vitest";
import { getWalletPaymentOrdersUrl } from "./payment-redirect.js";

describe("getWalletPaymentOrdersUrl", () => {
  it("chỉ tạo URL đơn hàng sau khi thanh toán ví đã được xác nhận", () => {
    expect(getWalletPaymentOrdersUrl({ status: "paid", payment_method: "wallet", order_number: "NX-1001" }))
      .toBe("/orders.html?paid=wallet&order=NX-1001");
  });

  it("không điều hướng chuyển khoản hoặc đơn chưa được xác nhận thanh toán", () => {
    expect(getWalletPaymentOrdersUrl({ status: "pending_payment", payment_method: "vietqr", order_number: "NX-1002" })).toBeNull();
    expect(getWalletPaymentOrdersUrl({ status: "pending_payment", payment_method: "wallet", order_number: "NX-1003" })).toBeNull();
  });
});
