import { describe, expect, it } from "vitest";
import { calculateSaleDiscount, normalizeSaleCode, resolveSalePricing } from "./sale-code.js";

const now = Date.parse("2026-01-01T00:00:00Z");
const campaign = (overrides = {}) => ({ code: "SAVE10", is_active: true, starts_at: "2025-12-01T00:00:00Z", ends_at: "2026-02-01T00:00:00Z", discount_type: "percent", discount_value: 10, minimum_order_amount: 100000, maximum_discount_amount: 50000, usage_count: 0, usage_limit: 100, ...overrides });

describe("sale code pricing", () => {
  it("normalizes user input", () => expect(normalizeSaleCode("  save10 ")).toBe("SAVE10"));
  it("applies percent discount and cap", () => expect(calculateSaleDiscount(campaign(), 1000000)).toBe(50000));
  it("keeps a valid code pending below the minimum", () => expect(resolveSalePricing({ campaigns: [campaign()], code: "save10", subtotal: 90000, now }).status).toBe("below_minimum"));
  it("applies a valid code", () => expect(resolveSalePricing({ campaigns: [campaign()], code: "save10", subtotal: 500000, now })).toMatchObject({ status: "applied", discount: 50000, total: 450000 }));
  it("rejects unknown, expired and exhausted codes", () => {
    expect(resolveSalePricing({ campaigns: [], code: "nope", subtotal: 500000, now }).status).toBe("unknown_code");
    expect(resolveSalePricing({ campaigns: [campaign({ ends_at: "2025-12-31T23:59:59Z" })], code: "save10", subtotal: 500000, now }).status).toBe("inactive");
    expect(resolveSalePricing({ campaigns: [campaign({ usage_count: 100 })], code: "save10", subtotal: 500000, now }).status).toBe("sold_out");
  });
});
