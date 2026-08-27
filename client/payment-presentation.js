export function getPaymentPresentation(method, hasReadyQr = false) {
  const isZaloPay = method === "zalopay" && hasReadyQr;
  return { isZaloPay, showZaloPayGuide: isZaloPay };
}
