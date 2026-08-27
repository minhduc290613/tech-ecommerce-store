export function normalizeDeliveryPhone(phone = "") {
  const normalizedPhone = String(phone).trim();
  if (!normalizedPhone) return { valid: false, field: "phone", message: "Vui lòng nhập số điện thoại nhận hàng.", phone: normalizedPhone };
  if (normalizedPhone.length < 8 || normalizedPhone.length > 20) return { valid: false, field: "phone", message: "Số điện thoại nhận hàng cần từ 8 đến 20 ký tự.", phone: normalizedPhone };
  return { valid: true, phone: normalizedPhone };
}

export function normalizeShippingAddress(address = "") {
  const normalizedAddress = String(address).trim();
  if (!normalizedAddress) return { valid: false, field: "address", message: "Vui lòng nhập địa chỉ nhận hàng.", address: normalizedAddress };
  if (normalizedAddress.length < 8 || normalizedAddress.length > 500) return { valid: false, field: "address", message: "Địa chỉ nhận hàng cần từ 8 đến 500 ký tự.", address: normalizedAddress };
  return { valid: true, address: normalizedAddress };
}

export function normalizeDeliveryProfile({ phone = "", address = "" } = {}) {
  const phoneResult = normalizeDeliveryPhone(phone);
  const addressResult = normalizeShippingAddress(address);
  if (!phoneResult.valid) return { ...phoneResult, address: addressResult.address };
  if (!addressResult.valid) return { ...addressResult, phone: phoneResult.phone };
  return { valid: true, phone: phoneResult.phone, address: addressResult.address };
}
