import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "client/admin.js"), "utf8");

describe("Command Deck revenue", () => {
  it("counts only paid, processing and completed orders with a positive total", () => {
    expect(source).toContain('const REVENUE_STATUSES = new Set(["paid", "processing", "completed"])');
    expect(source).toContain('REVENUE_STATUSES.has(order?.status) && Number(order?.total_amount || 0) > 0');
    expect(source).toContain("state.orders.filter(isRevenueOrder).reduce");
  });

  it("refreshes revenue when an order changes and while the dashboard is visible", () => {
    expect(source).toContain('table: "orders"');
    expect(source).toContain('if (state.user) loadData()');
    expect(source).toContain('window.setInterval(() => { if (!document.hidden && state.user) loadData(); }, 30000)');
  });

  it("does not treat pending payment as revenue", () => {
    expect(source).toContain('state.orders.filter((order) => order.status === "pending_payment")');
    expect(source).not.toContain('REVENUE_STATUSES = new Set(["pending_payment"');
  });
});
