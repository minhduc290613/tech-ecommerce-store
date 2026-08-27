export function getCheckoutDelivery({ customerName = "", customerPhone = "", shippingAddress = "" } = {}) {
  const name = String(customerName).trim();
  const phone = String(customerPhone).trim();
  const address = String(shippingAddress).trim();
  if (!address) return { valid: false, message: "Vui lòng nhập địa chỉ nhận hàng.", name, phone, address };
  if (address.length > 500) return { valid: false, message: "Địa chỉ nhận hàng tối đa 500 ký tự.", name, phone, address };
  if (name.length > 140 || phone.length > 40) return { valid: false, message: "Thông tin người nhận quá dài. Hãy kiểm tra lại.", name, phone, address };
  return { valid: true, name, phone, address };
}
