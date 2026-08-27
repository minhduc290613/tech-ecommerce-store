import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("account delivery layout", () => {
  it("tách địa chỉ ra tab riêng và đặt số điện thoại trong Bảo mật", () => {
    const source = readFileSync(resolve(process.cwd(), "client/account-center.js"), "utf8");
    expect(source).toContain('data-account-tab="delivery"');
    expect(source).toContain('data-account-panel="delivery"');
    expect(source).toContain('id="accountDeliveryAddressForm"');
    expect(source).toContain('id="accountPhoneForm"');
    expect(source.indexOf('data-account-panel="security"')).toBeLessThan(source.indexOf('id="accountPhoneForm"'));
  });
});
