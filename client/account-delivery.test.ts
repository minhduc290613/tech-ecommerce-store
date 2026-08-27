import { describe, expect, it } from "vitest";
import { normalizeDeliveryProfile } from "./account-delivery.js";

describe("delivery profile", () => {
  it("yêu cầu cả số điện thoại và địa chỉ", () => {
    expect(normalizeDeliveryProfile({ phone: "", address: "12 Nguyễn Huệ, Quận 1" })).toMatchObject({ valid: false, message: "Vui lòng nhập số điện thoại nhận hàng." });
    expect(normalizeDeliveryProfile({ phone: "0901234567", address: "" })).toMatchObject({ valid: false, message: "Vui lòng nhập địa chỉ nhận hàng." });
  });

  it("chuẩn hóa hồ sơ giao nhận hợp lệ", () => {
    expect(normalizeDeliveryProfile({ phone: " 0901 234 567 ", address: " 12 Nguyễn Huệ, Quận 1 " })).toEqual({ valid: true, phone: "0901 234 567", address: "12 Nguyễn Huệ, Quận 1" });
  });
});
