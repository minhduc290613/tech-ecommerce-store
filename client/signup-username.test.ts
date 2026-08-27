import { describe, expect, it } from "vitest";
import { normalizeSignupUsername } from "./signup-username.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("signup username", () => {
  it("chuẩn hóa username hợp lệ khi đăng ký", () => {
    expect(normalizeSignupUsername("  NEXORA.User_01 ")).toEqual({ valid: true, username: "nexora.user_01" });
  });

  it("từ chối username trống hoặc chứa ký tự không hợp lệ", () => {
    expect(normalizeSignupUsername("")).toMatchObject({ valid: false });
    expect(normalizeSignupUsername("nexora user")).toMatchObject({ valid: false });
  });

  it("gửi username khi signup, nhưng không gửi username khi chỉ lưu số điện thoại", () => {
    const storefront = readFileSync(resolve(process.cwd(), "client/app.js"), "utf8");
    const account = readFileSync(resolve(process.cwd(), "client/account-center.js"), "utf8");
    const schema = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    expect(storefront).toContain("username: signupUsername.username");
    expect(account).toContain("displayName: null, username: null, phone: phone.phone");
    expect(schema).toContain("insert into public.shipping_addresses(user_id, label, address, is_default) values (new.id, 'Địa chỉ mặc định', v_default_shipping_address, true)");
  });
});
