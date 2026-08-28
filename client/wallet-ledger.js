export function normalizeLedgerEntry(entry = {}) {
  const amount = Number(entry.amount || 0);
  const balanceAfter = Number(entry.balance_after || 0);
  const balanceBefore = entry.balance_before === null || entry.balance_before === undefined
    ? balanceAfter - amount
    : Number(entry.balance_before);
  return {
    ...entry,
    amount,
    balanceBefore,
    balanceAfter,
    direction: amount >= 0 ? "credit" : "debit",
  };
}

export function ledgerDirectionLabel(direction) {
  return direction === "credit" ? "Cộng tiền" : "Trừ tiền";
}

export function ledgerTypeLabel(type) {
  return ({
    topup: "Nạp tiền",
    admin_credit: "Cộng bởi Admin",
    admin_debit: "Trừ bởi Admin",
    wallet_payment: "Thanh toán đơn",
    refund: "Hoàn tiền",
    affiliate_commission: "Hoa hồng Affiliate",
  })[type] || type || "Biến động khác";
}
