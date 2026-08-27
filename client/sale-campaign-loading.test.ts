import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

describe("mã sale không ghim trên storefront", () => {
  it("tải mọi mã đang được RLS cho phép để khách có thể nhập mã hợp lệ ở giỏ", () => {
    expect(app).toContain('db.from("sale_campaigns").select("*").order("created_at", { ascending: false })');
    expect(app).not.toContain('db.from("sale_campaigns").select("*").eq("is_hunt_featured", true)');
  });

  it("chỉ hiển thị thẻ săn sale khi mã đã được ghim, nhưng vẫn giữ mã còn lại trong bộ kiểm tra", () => {
    expect(app).toContain("campaign.is_hunt_featured && isCampaignActive(campaign)");
    expect(app).toContain("function getCampaignByCode(code)");
  });
});
