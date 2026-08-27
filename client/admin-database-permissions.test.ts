import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Command Deck database permissions", () => {
  it("cấp SELECT khi RLS bảo vệ gallery và EXECUTE cho hàm logistics dùng trong policy", () => {
    const schema = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    expect(schema).toContain("grant select on table public.product_images to anon, authenticated");
    expect(schema).toContain("grant execute on function public.can_manage_shipments() to authenticated");
  });
});
