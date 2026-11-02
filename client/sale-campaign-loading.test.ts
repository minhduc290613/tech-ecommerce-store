import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

describe("mã sale không ghim trên storefront", () => {
  it("tải mọi mã đang được RLS cho phép để khách có thể nhập mã hợp lệ ở giỏ", () => {
    expect(app).toContain('db.from("sale_campaigns").select("*").order("created_at", { ascending: false })');
    expect(app).not.toContain('db.from("sale_campaigns").select("*").eq("is_hunt_featured", true)');
  });

	it("hiển thị mọi mã đang hoạt động và ưu tiên mã được ghim lên trước", () => {
		expect(app).toContain("state.saleCampaigns.filter((campaign) => isCampaignActive(campaign))");
		expect(app).toContain("Number(Boolean(b.is_hunt_featured)) - Number(Boolean(a.is_hunt_featured))");
		expect(app).toContain("function getCampaignByCode(code)");
	});
});
