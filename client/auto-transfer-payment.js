export const AUTO_TRANSFER_PROVIDERS = Object.freeze({
  sepay: { label: "SePay", webhookPath: "/api/payments/webhooks/sepay", detail: "Webhook HMAC-SHA256" },
  casso: { label: "Casso", webhookPath: "/api/payments/webhooks/casso", detail: "Webhook secure-token" },
  vietqr: { label: "VietQR Host2Host", webhookPath: "/bank/api/transaction-sync", tokenPath: "/api/token_generate", detail: "Callback Bearer Token" },
});

export function normalizeAutoTransferSettings(settings = {}) {
  const provider = Object.hasOwn(AUTO_TRANSFER_PROVIDERS, settings.payment_auto_transfer_provider)
    ? settings.payment_auto_transfer_provider
    : "sepay";
  return {
    enabled: settings.payment_auto_transfer_enabled === true,
    provider,
    providerLabel: AUTO_TRANSFER_PROVIDERS[provider].label,
    hasReceivingAccount: [settings.payment_bank_id, settings.payment_account_number, settings.payment_account_name]
      .every((value) => String(value || "").trim().length > 0),
  };
}

export function getAutoTransferPresentation(settings = {}) {
  const normalized = normalizeAutoTransferSettings(settings);
  return {
    ...normalized,
    ready: normalized.enabled && normalized.hasReceivingAccount,
    webhookPath: AUTO_TRANSFER_PROVIDERS[normalized.provider].webhookPath,
    tokenPath: AUTO_TRANSFER_PROVIDERS[normalized.provider].tokenPath || null,
  };
}

export function paymentMethodLabel(method, provider = "") {
  if (method === "auto_transfer") return `CK tự động${provider && AUTO_TRANSFER_PROVIDERS[provider] ? ` · ${AUTO_TRANSFER_PROVIDERS[provider].label}` : ""}`;
  return method;
}
