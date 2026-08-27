import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAffiliateMetrics } from "./affiliate-dashboard-metrics.js";

describe("affiliate dashboard metrics", () => {
  it("tính các chỉ số từ dữ liệu dashboard thực tế", () => {
    expect(buildAffiliateMetrics({ click_count: 25, referral_count: 4, successful_order_count: 3, commission_earned: 450000, commission_pending_reversal: 12000, commission_reversed: 8000 })).toEqual({ clicks: 25, referrals: 4, successfulOrders: 3, earned: 450000, pendingReversal: 12000, reversed: 8000, conversionRate: 16 });
  });

  it("không chia cho 0 khi affiliate chưa có lượt click", () => {
    expect(buildAffiliateMetrics({ referral_count: 2 }).conversionRate).toBe(0);
  });

  it("không để CSS trạng thái tải ghi đè thuộc tính hidden", () => {
    const css = readFileSync(resolve(process.cwd(), "client/affiliate-dashboard.css"), "utf8");
    expect(css).toContain("[hidden]{display:none!important}");
  });
});
