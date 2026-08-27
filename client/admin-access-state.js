export function getAdminAccessMessage({ sessionError, authorizationError, allowed } = {}) {
  if (sessionError) return "Phiên đăng nhập cũ không còn hợp lệ. Hãy đăng nhập lại bằng email và mật khẩu.";
  if (authorizationError) return `Không thể kiểm tra quyền Command Deck: ${authorizationError}`;
  if (allowed === false) return "Đăng nhập thành công nhưng tài khoản này chưa có quyền mở Command Deck. Hãy nhờ admin cấp quyền commandDeck.";
  return "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.";
}
