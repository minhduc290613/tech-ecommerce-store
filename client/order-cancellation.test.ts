import { describe, expect, it } from "vitest";
import { canCancelPendingOrder, cancellationReason } from "./order-cancellation.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("order cancellation rules", () => {
  it("chỉ cho phép hủy đơn còn chờ thanh toán và chưa giao nhận", () => {
    expect(canCancelPendingOrder({ status: "pending_payment", fulfillment_status: "unfulfilled" })).toBe(true);
    expect(canCancelPendingOrder({ status: "paid", fulfillment_status: "unfulfilled" })).toBe(false);
    expect(canCancelPendingOrder({ status: "pending_payment", fulfillment_status: "preparing" })).toBe(false);
  });

  it("phân biệt ghi chú hủy của khách và vận hành", () => {
    expect(cancellationReason("customer")).toContain("Khách hàng");
    expect(cancellationReason("manager")).toContain("vận hành");
  });

  it("yêu cầu RPC có guard và không cho khôi phục đơn đã hủy", () => {
    const schema = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    expect(schema).toContain("create or replace function public.cancel_my_order");
    expect(schema).toContain("create or replace function public.cancel_order_as_manager");
    expect(schema).toContain("old.status = 'cancelled' and new.status <> 'cancelled'");
    expect(schema).toContain("old.status <> 'pending_payment' or coalesce(old.fulfillment_status, 'unfulfilled') <> 'unfulfilled'");
  });
});
