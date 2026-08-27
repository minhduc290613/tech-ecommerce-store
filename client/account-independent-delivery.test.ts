import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("account delivery updates", () => {
  it("gửi null cho trường giao nhận không được cập nhật", () => {
    const source = readFileSync(resolve(process.cwd(), "client/account-center.js"), "utf8");
    expect(source).toContain('p_delivery_phone: phone, p_default_shipping_address: address');
    expect(source).toContain('phone = null, address = null');
  });

  it("giữ checkout bắt buộc đủ số điện thoại và địa chỉ", () => {
    const schema = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    expect(schema).toContain("-- 32. Account Center cho phép cập nhật số điện thoại và địa chỉ độc lập; checkout vẫn bắt buộc đủ cả hai.");
    expect(schema).toContain("if p_delivery_phone is not null and (v_phone is null or length(v_phone) not between 8 and 20)");
    expect(schema).toContain("if nullif(trim(p_customer_phone), '') is null then raise exception 'Vui lòng nhập số điện thoại nhận hàng.';");
    expect(schema).toContain("if nullif(trim(p_shipping_address), '') is null then raise exception 'Vui lòng nhập địa chỉ nhận hàng.';");
  });
});
