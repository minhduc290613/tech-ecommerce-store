/** Pure sale-code rules shared by storefront pricing and tests. */
export function normalizeSaleCode(code) { return String(code || "").trim().toUpperCase(); }
export function findCampaignByCode(campaigns, code) {
  const normalized = normalizeSaleCode(code);
  return (campaigns || []).find((campaign) => normalizeSaleCode(campaign?.code) === normalized) || null;
}
export function isCampaignActive(campaign, now = Date.now()) {
  if (!campaign || campaign.is_active === false) return false;
  const starts = new Date(campaign.starts_at).getTime();
  const ends = new Date(campaign.ends_at).getTime();
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts > now || ends < now) return false;
  const limit = Number(campaign.usage_limit || 0);
  return !limit || Number(campaign.usage_count || 0) < limit;
}
export function calculateSaleDiscount(campaign, subtotal) {
  const amount = Math.max(0, Number(subtotal || 0));
  const value = Number(campaign?.discount_value || 0);
  if (!campaign || value <= 0) return 0;
  let discount = campaign.discount_type === "percent" ? Math.floor(amount * value / 100) : value;
  const maximum = Number(campaign.maximum_discount_amount || 0);
  if (maximum > 0) discount = Math.min(discount, maximum);
  return Math.max(0, Math.min(discount, amount));
}
export function resolveSalePricing({ campaigns, code, subtotal, now = Date.now() }) {
  const amount = Math.max(0, Number(subtotal || 0));
  const normalized = normalizeSaleCode(code);
  const base = { subtotal: amount, discount: 0, total: amount, campaign: null, code: normalized, minimumOrderAmount: 0 };
  if (!normalized) return { ...base, status: "none" };
  const campaign = findCampaignByCode(campaigns, normalized);
  if (!campaign) return { ...base, status: "unknown_code" };
  const minimum = Number(campaign.minimum_order_amount || 0);
  const limit = Number(campaign.usage_limit || 0);
  if (!isCampaignActive(campaign, now)) return { ...base, status: limit > 0 && Number(campaign.usage_count || 0) >= limit ? "sold_out" : "inactive", minimumOrderAmount: minimum };
  if (amount < minimum) return { ...base, status: "below_minimum", minimumOrderAmount: minimum, campaign };
  const discount = calculateSaleDiscount(campaign, amount);
  return { ...base, status: "applied", campaign, discount, total: amount - discount, minimumOrderAmount: minimum };
}
export function saleCodeMessage(status, minimumOrderAmount, formatCurrency = String) {
  if (status === "unknown_code") return "Mã săn sale không tồn tại hoặc chưa được mở.";
  if (status === "sold_out") return "Mã săn sale đã hết lượt sử dụng.";
  if (status === "inactive") return "Mã săn sale đã hết hạn hoặc đang tạm dừng.";
  if (status === "below_minimum") return `Đơn cần tối thiểu ${formatCurrency(minimumOrderAmount)} để dùng mã này.`;
  return "";
}
