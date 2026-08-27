import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (name: string) => readFileSync(resolve(process.cwd(), name), "utf8");

describe("product gallery and safe order archive", () => {
  it("lưu gallery bằng RPC giới hạn, chỉ Admin quản lý và không xóa cứng đơn", () => {
    const schema = projectFile("supabase-unified.sql");
    expect(schema).toContain("create table if not exists public.product_images");
    expect(schema).toContain("jsonb_array_length(p_image_urls) not between 1 and 8");
    expect(schema).toContain("not public.is_admin()");
    expect(schema).toContain("create or replace function public.archive_cancelled_order");
    expect(schema).toContain("if v_order.status <> 'cancelled'");
    expect(schema).toContain("archived_at = now()");
  });

  it("đưa ảnh phụ vào xem nhanh và gắn thao tác hủy/lưu trữ vào hai khu vực đơn hàng", () => {
    const app = projectFile("client/app.js");
    const admin = projectFile("client/admin.js");
    const orders = projectFile("client/orders.js");
    expect(app).toContain("productGalleryUrls(product)");
    expect(app).toContain("data-gallery-image");
    expect(admin).toContain("replace_product_gallery");
    expect(admin).toContain("archive_cancelled_order");
    expect(orders).toContain("cancel_my_order");
  });
});
