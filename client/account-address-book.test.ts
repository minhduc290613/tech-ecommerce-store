import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("shipping address book", () => {
  it("có luồng thêm, sửa, chọn mặc định và xóa địa chỉ", () => {
    const source = readFileSync(resolve(process.cwd(), "client/account-center.js"), "utf8");
    expect(source).toContain('db.rpc("save_my_shipping_address"');
    expect(source).toContain('db.rpc("set_my_default_shipping_address"');
    expect(source).toContain('db.rpc("delete_my_shipping_address"');
    expect(source).toContain('db.rpc("list_my_shipping_addresses")');
  });

  it("hiển thị trạng thái đã cập nhật cho điện thoại và địa chỉ mặc định", () => {
    const source = readFileSync(resolve(process.cwd(), "client/account-center.js"), "utf8");
    expect(source).toContain('id="accountPhoneStatus"');
    expect(source).toContain('id="accountAddressStatus"');
    expect(source).toContain("Địa chỉ mặc định:");
  });

  it("giữ địa chỉ mặc định đồng bộ với checkout và không mở quyền đọc bảng trực tiếp", () => {
    const storefront = readFileSync(resolve(process.cwd(), "client/app.js"), "utf8");
    const schema = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    expect(storefront).toContain('profile.default_shipping_address || ""');
    expect(schema).toContain("create unique index if not exists shipping_addresses_one_default_idx on public.shipping_addresses(user_id) where is_default;");
    expect(schema).toContain("revoke all on table public.shipping_addresses from public, anon, authenticated;");
  });
});
