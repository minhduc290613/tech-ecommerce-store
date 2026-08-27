export function buildAffiliateMetrics(payload = {}) {
  const clicks = Number(payload.click_count || 0);
  const referrals = Number(payload.referral_count || 0);
  const successfulOrders = Number(payload.successful_order_count || 0);
  const earned = Number(payload.commission_earned || 0);
  const pendingReversal = Number(payload.commission_pending_reversal || 0);
  const reversed = Number(payload.commission_reversed || 0);
  return {
    clicks,
    referrals,
    successfulOrders,
    earned,
    pendingReversal,
    reversed,
    conversionRate: clicks > 0 ? Math.round((referrals / clicks) * 1000) / 10 : 0,
  };
}
