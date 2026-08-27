export function normalizeSignupUsername(value = "") {
  const username = String(value).trim().toLowerCase();
  if (username.length < 3 || username.length > 40) return { valid: false, message: "Username cần từ 3 đến 40 ký tự.", username };
  if (!/^[a-z0-9_.-]+$/.test(username)) return { valid: false, message: "Username chỉ dùng chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.", username };
  return { valid: true, username };
}
