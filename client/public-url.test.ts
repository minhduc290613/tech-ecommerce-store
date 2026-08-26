import { describe, expect, it } from "vitest";
import { getAuthRedirectUrl, getPublicSiteUrl, isSafePublicSiteUrl, NEXORA_FALLBACK_PUBLIC_SITE_URL } from "./public-url.js";

describe("public email URL", () => {
  it("chỉ chấp nhận origin HTTPS công khai cho email Auth", () => {
    expect(isSafePublicSiteUrl("https://shop.example.vn/path")).toBe(true);
    expect(isSafePublicSiteUrl("http://shop.example.vn")).toBe(false);
    expect(isSafePublicSiteUrl("http://localhost:3000")).toBe(false);
    expect(isSafePublicSiteUrl("https://3000-preview.manus.computer")).toBe(false);
  });

  it("dùng production fallback thay vì localhost và giữ redirect nhất quán", () => {
    expect(getPublicSiteUrl("http://localhost:3000")).toBe(NEXORA_FALLBACK_PUBLIC_SITE_URL);
    expect(getAuthRedirectUrl("https://shop.example.vn/anything")).toBe("https://shop.example.vn/");
  });
});
