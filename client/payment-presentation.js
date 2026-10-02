export function getPaymentPresentation(method, hasReadyQr = false, eWalletProvider = "momo") {
  const isEWallet = method === "e_wallet";
  const hasZaloPayQr = eWalletProvider === "zalopay" && hasReadyQr;
  return {
    isEWallet,
    eWalletProvider,
    isZaloPay: isEWallet && hasZaloPayQr,
    showZaloPayGuide: isEWallet && hasZaloPayQr,
  };
}

export function getPaymentMethodGroup(method) {
  if (method === "momo" || method === "zalopay" || method === "e_wallet") return "e_wallet";
  if (method === "payos" || method === "auto_transfer") return "auto_transfer";
  return method;
}
