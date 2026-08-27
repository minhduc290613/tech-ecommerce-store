import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin image sources", () => {
  it("giữ URL và thêm tải ảnh lên cho mọi trường ảnh Command Deck", () => {
    const admin = readFileSync(resolve(process.cwd(), "client/admin.js"), "utf8");
    const logistics = readFileSync(resolve(process.cwd(), "client/admin-logistics.js"), "utf8");
    expect(admin).toContain('target: "#productImageUrl"');
    expect(admin).toContain('target: "#shopBannerUrl"');
    expect(admin).toContain('db.storage.from("nexora-brand-assets").upload');
    expect(logistics).toContain('id="carrierAssetUpload"');
    expect(logistics).toContain('const path = `carriers/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`');
  });
});
