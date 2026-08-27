import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../supabase-unified.sql", import.meta.url), "utf8");
const orders = readFileSync(new URL("./orders.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("./admin.js", import.meta.url), "utf8");
const roles = readFileSync(new URL("./admin-roles-content.js", import.meta.url), "utf8");

describe("quy trình hủy đã thanh toán và trả hàng", () => {
  it("lưu yêu cầu hậu mãi có lý do, trạng thái và phân quyền đọc", () => {
    expect(schema).toContain("create table if not exists public.order_service_requests");
    expect(schema).toContain("service_type in ('paid_cancellation','return')");
    expect(schema).toContain('Users read own order service requests');
    expect(schema).toContain('Order managers read order service requests');
  });

  it("chỉ nhận hủy đã thanh toán trước bàn giao và trả hàng sau giao", () => {
    expect(schema).toContain("Chỉ yêu cầu hủy đơn đã thanh toán khi đơn chưa bàn giao vận chuyển.");
    expect(schema).toContain("Chỉ yêu cầu trả hàng với đơn đã giao hợp lệ.");
    expect(schema).toContain("paid_request_allowed");
  });

  it("không tự hoàn tiền khi tạo hay hoàn tất yêu cầu hậu mãi", () => {
    const serviceFunctions = schema.slice(schema.indexOf("create or replace function public.request_post_payment_order_service"));
    expect(serviceFunctions).not.toContain("insert into public.wallet_ledger");
    expect(orders).toContain("Thao tác này không tự động hoàn tiền.");
    expect(roles).toContain("Hủy sau thanh toán không tự hoàn tiền");
  });

  it("có lối tạo yêu cầu cho khách, Admin và queue xét duyệt", () => {
    expect(orders).toContain("Yêu cầu hủy đã thanh toán");
    expect(orders).toContain("Yêu cầu trả hàng");
    expect(admin).toContain("requestPostPaymentServiceAsManager");
    expect(roles).toContain("review_post_payment_order_service");
  });
});
