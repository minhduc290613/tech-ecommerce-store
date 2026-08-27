const MANUAL_TRANSFER_METHODS = new Set(["vietqr", "momo"]);

export function isManualTransferAwaitingConfirmation(order) {
  return Boolean(order && order.status === "pending_payment" && MANUAL_TRANSFER_METHODS.has(order.payment_method));
}

export function getManualTransferReviewQueue(orders) {
  return (orders || []).filter(isManualTransferAwaitingConfirmation).sort((a, b) => {
    const requestedDifference = Number(Boolean(b.zalo_confirmation_requested_at)) - Number(Boolean(a.zalo_confirmation_requested_at));
    if (requestedDifference) return requestedDifference;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });
}

export function canAdminConfirmPayment(order) {
  return isManualTransferAwaitingConfirmation(order);
}
