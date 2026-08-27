export function canCancelPendingOrder(order) {
  return order?.status === "pending_payment" && (order.fulfillment_status || "unfulfilled") === "unfulfilled";
}

export function cancellationReason(actor) {
  return actor === "customer" ? "Khách hàng hủy đơn trước khi thanh toán." : "Đơn được hủy bởi bộ phận vận hành.";
}
