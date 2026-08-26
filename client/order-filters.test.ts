import { describe, expect, it } from "vitest";
import { filterOrders } from "./order-filters.js";

const orders = [
  { order_number: "NXR-100-ABC", tracking_code: "GHN-987", carrier: "Giao Hàng Nhanh", customer_name: "Minh Đức", customer_phone: "0901000001", status: "paid", fulfillment_status: "shipped" },
  { order_number: "NXR-200-DEF", tracking_code: "GHTK-765", carrier: "Giao Hàng Tiết Kiệm", customer_name: "Lan", customer_phone: "0902000002", status: "pending_payment", fulfillment_status: "preparing" },
];

describe("filterOrders", () => {
  it("tra cứu không dấu theo mã vận đơn, khách và nhà vận chuyển", () => {
    expect(filterOrders(orders, { query: "ghn-987" })).toHaveLength(1);
    expect(filterOrders(orders, { query: "minh duc" })[0]?.order_number).toBe("NXR-100-ABC");
    expect(filterOrders(orders, { query: "tiet kiem" })[0]?.order_number).toBe("NXR-200-DEF");
  });

  it("kết hợp nhà vận chuyển, thanh toán và fulfillment", () => {
    expect(filterOrders(orders, { carrier: "Giao Hàng Nhanh", payment: "paid", fulfillment: "shipped" })).toHaveLength(1);
    expect(filterOrders(orders, { carrier: "Giao Hàng Nhanh", payment: "pending_payment" })).toHaveLength(0);
  });
});
