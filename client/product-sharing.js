export function buildProductShareUrl(origin, productId, referralCode = "") {
  const url = new URL("/", origin);
  url.searchParams.set("product", String(productId));
  if (/^[A-Z0-9]{6,18}$/i.test(String(referralCode))) url.searchParams.set("ref", String(referralCode).toUpperCase());
  return url.toString();
}

export function buildProductShareText(productName, priceLabel, hasAffiliateReferral = false) {
  return `${productName} — ${priceLabel}${hasAffiliateReferral ? " | Link giới thiệu NEXORA" : ""}`;
}
