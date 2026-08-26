function fold(value) {
  return String(value || "").trim().toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export function filterOrders(orders, filters = {}) {
  const query = fold(filters.query);
  const carrier = fold(filters.carrier);
  return orders.filter((order) => {
    const haystack = fold(`${order.order_number || ""} ${order.tracking_code || ""} ${order.carrier || ""} ${order.customer_name || ""} ${order.customer_phone || ""}`);
    const matchesQuery = !query || haystack.includes(query);
    const matchesCarrier = !carrier || carrier === "all" || fold(order.carrier) === carrier;
    const matchesFulfillment = !filters.fulfillment || filters.fulfillment === "all" || (order.fulfillment_status || "unfulfilled") === filters.fulfillment;
    const matchesPayment = !filters.payment || filters.payment === "all" || order.status === filters.payment;
    return matchesQuery && matchesCarrier && matchesFulfillment && matchesPayment;
  });
}
