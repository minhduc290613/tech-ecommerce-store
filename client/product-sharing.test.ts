import { describe, expect, it } from "vitest";
import { buildProductShareText, buildProductShareUrl } from "./product-sharing.js";

describe("product sharing", () => {
  it("tạo link sản phẩm không gắn referral nếu người chia sẻ chưa là affiliate được duyệt", () => {
    expect(buildProductShareUrl("https://shop.example", "product-7")).toBe("https://shop.example/?product=product-7");
  });

  it("chỉ gắn referral code đúng định dạng vào link affiliate", () => {
    expect(buildProductShareUrl("https://shop.example", "product 7", "nxr12345")).toBe("https://shop.example/?product=product+7&ref=NXR12345");
    expect(buildProductShareText("Laptop NEXORA", "10.000đ", true)).toContain("Link giới thiệu NEXORA");
  });
});
