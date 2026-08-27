export function getZaloPayCopyActions({ paymentMethod, hasReadyQr, orderNumber, accountNumber }) {
  const visible = paymentMethod === "zalopay" && Boolean(hasReadyQr);
  const transferContent = String(orderNumber || "").trim();
  const normalizedAccountNumber = String(accountNumber || "").replace(/\s+/g, "").trim();

  return {
    visible,
    transferContent,
    accountNumber: normalizedAccountNumber,
    canCopyTransferContent: visible && Boolean(transferContent),
    canCopyAccountNumber: visible && Boolean(normalizedAccountNumber),
  };
}
