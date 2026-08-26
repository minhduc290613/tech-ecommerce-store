import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("bank-transfer payment confirmation guard", () => {
  it("chỉ ghi nhận yêu cầu xác nhận, không tự đánh dấu đơn đã thanh toán", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    const body = sql.match(/create or replace function public\.request_order_payment_confirmation[\s\S]*?\n\$\$;/)?.[0] || "";
    expect(body).toContain("zalo_confirmation_requested_at = now()");
    expect(body).not.toMatch(/status\s*=\s*'paid'/i);
  });
});
