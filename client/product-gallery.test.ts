import { describe, expect, it } from "vitest";
import { normalizeProductGallery, productGalleryUrls } from "./product-gallery.js";

describe("product gallery", () => {
  it("giữ ảnh chính ở đầu, lọc ảnh trùng/không phải HTTPS và giới hạn tám ảnh", () => {
    const images = normalizeProductGallery("https://cdn.example/one.jpg", ["https://cdn.example/two.jpg", "https://cdn.example/one.jpg", "http://bad.example/three.jpg", ...Array.from({ length: 10 }, (_, i) => `https://cdn.example/${i}.jpg`)]);
    expect(images[0]).toBe("https://cdn.example/one.jpg");
    expect(images).toHaveLength(8);
    expect(images).not.toContain("http://bad.example/three.jpg");
  });

  it("đọc tương thích dữ liệu gallery dạng bản ghi", () => {
    expect(productGalleryUrls({ image_url: "https://cdn.example/one.jpg", product_images: [{ image_url: "https://cdn.example/two.jpg" }] })).toEqual(["https://cdn.example/one.jpg", "https://cdn.example/two.jpg"]);
  });
});
