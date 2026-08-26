export const NEXORA_FALLBACK_PUBLIC_SITE_URL = "https://nexorashop-gpjdasbm.manus.space";

export function isSafePublicSiteUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase();
    const isLocal = host === "localhost" || host === "0.0.0.0" || host === "::1" || host === "127.0.0.1" || host.endsWith(".local") || host.endsWith(".manus.computer");
    return url.protocol === "https:" && !isLocal && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getPublicSiteUrl(configuredUrl) {
  const source = isSafePublicSiteUrl(configuredUrl) ? configuredUrl : NEXORA_FALLBACK_PUBLIC_SITE_URL;
  return new URL(source).origin;
}

export function getAuthRedirectUrl(configuredUrl, pathname = "/") {
  return new URL(pathname, `${getPublicSiteUrl(configuredUrl)}/`).toString();
}
