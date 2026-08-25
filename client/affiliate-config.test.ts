import { describe, expect, it } from "vitest";
import { normalizeAffiliateProgramSettings } from "./affiliate-config.js";

describe("normalizeAffiliateProgramSettings", () => {
  it("chuẩn hóa cấu hình 15% và điều kiện affiliate hợp lệ", () => {
    expect(normalizeAffiliateProgramSettings({ active: true, commissionRate: "15", minDeliveredOrders: "1", minDeliveredAmount: "0", requiresApproval: true })).toEqual({
      p_active: true, p_commission_rate: 15, p_min_delivered_orders: 1, p_min_delivered_amount: 0, p_requires_approval: true,
    });
  });

  it("từ chối tỷ lệ hoặc điều kiện ngoài miền an toàn", () => {
    expect(() => normalizeAffiliateProgramSettings({ active: true, commissionRate: "101", minDeliveredOrders: "1", minDeliveredAmount: "0", requiresApproval: true })).toThrow("0–100%");
    expect(() => normalizeAffiliateProgramSettings({ active: true, commissionRate: "15", minDeliveredOrders: "-1", minDeliveredAmount: "0", requiresApproval: true })).toThrow("số nguyên không âm");
  });
});
