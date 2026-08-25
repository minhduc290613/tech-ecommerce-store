export function normalizeAffiliateProgramSettings(input) {
  const commissionRate = Number(input.commissionRate);
  const minDeliveredOrders = Number(input.minDeliveredOrders);
  const minDeliveredAmount = Number(input.minDeliveredAmount);
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) throw new Error("Tỷ lệ hoa hồng phải nằm trong khoảng 0–100%.");
  if (!Number.isInteger(minDeliveredOrders) || minDeliveredOrders < 0) throw new Error("Số đơn đã giao tối thiểu phải là số nguyên không âm.");
  if (!Number.isFinite(minDeliveredAmount) || minDeliveredAmount < 0) throw new Error("Giá trị đơn đã giao tối thiểu phải từ 0 trở lên.");
  return {
    p_active: Boolean(input.active),
    p_commission_rate: commissionRate,
    p_min_delivered_orders: minDeliveredOrders,
    p_min_delivered_amount: minDeliveredAmount,
    p_requires_approval: Boolean(input.requiresApproval),
  };
}
