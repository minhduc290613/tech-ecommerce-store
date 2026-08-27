import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const admin = readFileSync(new URL("./admin.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./admin-sale-usage-history.css", import.meta.url), "utf8");

describe("lịch sử dùng mã giảm giá trong Admin", () => {
  it("tải lịch sử đơn dùng mã sale không bao gồm thông tin định danh khách", () => {
    expect(admin).toContain('select("id,order_number,sale_campaign_id,sale_code,subtotal_amount,discount_amount,total_amount,status,created_at,archived_at")');
    expect(admin).toContain('.or("sale_campaign_id.not.is.null,sale_code.not.is.null")');
    expect(admin).not.toContain('saleUsageOrdersResult.data || []; state.saleUsageOrders = saleUsageOrdersResult.data || [];');
  });

  it("hiển thị bộ lọc theo mã cùng chỉ số ưu đãi và doanh thu đã xác nhận", () => {
    expect(admin).toContain('id="saleUsageCampaignFilter"');
    expect(admin).toContain('id="saleUsageDiscountTotal"');
    expect(admin).toContain('id="saleUsageConfirmedRevenue"');
    expect(admin).toContain('new Set(["paid", "processing", "completed"])');
    expect(admin).toContain("function saleUsageKey(order)");
  });

  it("giữ lịch sử responsive trên mobile", () => {
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).toContain("grid-template-columns: 1fr");
  });
});
