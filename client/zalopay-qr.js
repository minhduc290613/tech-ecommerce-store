export function getTrustedZaloPayQrUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
