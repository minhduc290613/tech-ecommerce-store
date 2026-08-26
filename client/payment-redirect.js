export function getWalletPaymentOrdersUrl(order) {
  if (!order || order.status !== "paid" || order.payment_method !== "wallet" || !order.order_number) return null;
  const params = new URLSearchParams({ paid: "wallet", order: String(order.order_number) });
  return `/orders.html?${params.toString()}`;
}
