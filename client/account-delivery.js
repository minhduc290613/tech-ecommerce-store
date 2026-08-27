export function normalizeDeliveryProfile({ phone = "", address = "" } = {}) {
  const normalizedPhone = String(phone).trim();
  const normalizedAddress = String(address).trim();
  if (!normalizedPhone) return { valid: false, field: "phone", message: "Vui lòng nhập số điện thoại nhận hàng.", phone: normalizedPhone, address: normalizedAddress };
  if (normalizedPhone.length < 8 || normalizedPhone.length > 20) return { valid: false, field: "phone", message: "Số điện thoại nhận hàng cần từ 8 đến 20 ký tự.", phone: normalizedPhone, address: normalizedAddress };
  if (!normalizedAddress) return { valid: false, field: "address", message: "Vui lòng nhập địa chỉ nhận hàng.", phone: normalizedPhone, address: normalizedAddress };
  if (normalizedAddress.length < 8 || normalizedAddress.length > 500) return { valid: false, field: "address", message: "Địa chỉ nhận hàng cần từ 8 đến 500 ký tự.", phone: normalizedPhone, address: normalizedAddress };
  return { valid: true, phone: normalizedPhone, address: normalizedAddress };
}
