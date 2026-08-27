import { describe, expect, it } from "vitest";
import { getTrustedZaloPayQrUrl } from "./zalopay-qr.js";

describe("ZaloPay QR config", () => {
  it("chỉ chấp nhận URL HTTPS cho ảnh QR do admin cấu hình", () => {
    expect(getTrustedZaloPayQrUrl("https://pay.example.com/zalopay-qr.png")).toBe("https://pay.example.com/zalopay-qr.png");
    expect(getTrustedZaloPayQrUrl("http://pay.example.com/qr.png")).toBeNull();
    expect(getTrustedZaloPayQrUrl("javascript:alert(1)")).toBeNull();
  });
});
