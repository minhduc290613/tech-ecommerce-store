export function isRecoveryCallback(search) {
  return new URLSearchParams(String(search || "")).get("recovery") === "1";
}

export function isPasswordRecoveryEvent(event) {
  return event === "PASSWORD_RECOVERY";
}

export function hasRecoveryCallbackError(search) {
  const query = new URLSearchParams(String(search || ""));
  return Boolean(query.get("error") || query.get("error_code"));
}

export function stripRecoveryParameters(search) {
  const source = new URLSearchParams(String(search || ""));
  const retained = new URLSearchParams();
  ["lang", "ref"].forEach((key) => { if (source.get(key)) retained.set(key, source.get(key)); });
  const value = retained.toString();
  return value ? `?${value}` : "";
}
