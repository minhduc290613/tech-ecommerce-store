import { describe, expect, it } from "vitest";
import { getCheckoutDelivery } from "./checkout-delivery.js";

describe("checkout delivery details", () => {
  it("yêu cầu địa chỉ nhận hàng có nội dung", () => {
    expect(getCheckoutDelivery({ shippingAddress: "   " })).toMatchObject({ valid: false, message: "Vui lòng nhập địa chỉ nhận hàng." });
  });

  it("chuẩn hóa thông tin nhận hàng trước khi tạo đơn", () => {
    expect(getCheckoutDelivery({ customerName: "  Minh  ", customerPhone: " 0901 234 567 ", shippingAddress: " 12 Nguyễn Huệ, Quận 1 " })).toEqual({ valid: true, name: "Minh", phone: "0901 234 567", address: "12 Nguyễn Huệ, Quận 1" });
  });
});
