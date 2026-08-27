import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa cập nhật";
const shipmentCopy = { not_ready: "Chờ chuẩn bị", packing: "Đang kiểm hàng", picked_up: "Đã bàn giao vận chuyển", in_transit: "Đang di chuyển", out_for_delivery: "Sắp giao tới bạn", delivered: "Đã giao", exception: "Cần hỗ trợ" };
const paymentCopy = { pending_payment: "Chờ thanh toán", paid: "Đã thanh toán", processing: "Đang xử lý", completed: "Hoàn thành", cancelled: "Đã hủy" };
let settings = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  $("#refreshOrders").addEventListener("click", loadOrders);
  if (!db) return showError("Storefront chưa kết nối dữ liệu.");
  const { data } = await db.auth.getSession();
  if (!data.session?.user) { $("#ordersLoading").hidden = true; $("#ordersAuthRequired").hidden = false; return; }
  await loadOrders();
}

async function loadOrders() {
  $("#ordersAuthRequired").hidden = true; $("#ordersLoading").hidden = false;
  const { data: sessionData } = await db.auth.getSession(); const user = sessionData.session?.user;
  if (!user) { $("#ordersLoading").hidden = true; $("#ordersAuthRequired").hidden = false; return; }
  const [ordersResult, settingsResult] = await Promise.all([
    db.from("orders").select("id,order_number,total_amount,status,payment_method,auto_transfer_provider,payment_confirmation_note,zalo_confirmation_requested_at,created_at,fulfillment_status,shipping_carrier_id,carrier,tracking_code,shipment_status,shipment_location,shipment_location_at,shipment_progress,shipment_note,shipping_address,shipping_note,order_items(product_name,quantity,unit_price),shipping_carriers(name,logo_url,tracking_url_template,note),order_shipment_events(shipment_status,location,progress,note,occurred_at)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("site_settings").select("zalo_phone,zalo_label,zalo_confirmation_message").eq("singleton", true).maybeSingle(),
  ]);
  $("#ordersLoading").hidden = true; settings = settingsResult.data || null;
  if (ordersResult.error) return showError("Chưa thể tải đơn hàng. Hãy thử lại sau ít phút.");
  renderOrders(ordersResult.data || []);
}

function renderOrders(orders) {
  $("#ordersSummary").innerHTML = `<span>ĐƠN ĐANG THEO DÕI</span><strong>${orders.filter((order) => order.status !== "cancelled" && order.shipment_status !== "delivered").length.toString().padStart(2, "0")}</strong><small>trên ${orders.length} đơn hàng</small>`;
  $("#ordersList").innerHTML = orders.length ? orders.map(renderOrder).join("") : '<article class="orders-empty"><i class="fa-solid fa-box-open"></i><h2>Bạn chưa có đơn hàng</h2><p>Hãy khám phá catalog để bắt đầu trải nghiệm NEXORA.</p><a href="/#products">Khám phá sản phẩm</a></article>';
  document.querySelectorAll("[data-payment-confirm]").forEach((button) => button.addEventListener("click", requestPaymentConfirmation));
}

function renderOrder(order) {
  const carrier = Array.isArray(order.shipping_carriers) ? order.shipping_carriers[0] : order.shipping_carriers;
  const progress = Math.max(0, Math.min(100, Number(order.shipment_progress || 0)));
  const events = [...(order.order_shipment_events || [])].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
  const carrierMark = carrier?.logo_url ? `<img src="${escapeHtml(carrier.logo_url)}" alt="${escapeHtml(carrier.name)}" />` : `<i class="fa-solid fa-truck-fast"></i>`;
  const trackingUrl = carrier?.tracking_url_template && order.tracking_code ? carrier.tracking_url_template.replace("{tracking_code}", encodeURIComponent(order.tracking_code)) : "";
  const autoTransfer = order.payment_method === "auto_transfer";
  const providerLabel = { sepay: "SePay", casso: "Casso", vietqr: "VietQR Host2Host" }[order.auto_transfer_provider] || "nhà cung cấp đã chọn";
  const paymentAction = order.status === "pending_payment" && autoTransfer ? `<span class="payment-complete"><i class="fa-solid fa-bolt"></i> Đang tự đối soát qua ${escapeHtml(providerLabel)} — không cần nhắn shop</span>` : order.status === "pending_payment" ? `<button class="payment-confirm-button" data-payment-confirm="${escapeHtml(order.id)}" data-order-number="${escapeHtml(order.order_number)}" data-total="${Number(order.total_amount)}"><i class="fa-brands fa-zalo"></i> Đã thanh toán — liên hệ Zalo</button>` : `<span class="payment-complete"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(paymentCopy[order.status] || order.status)}</span>`;
  return `<article class="order-card"><header><div><span class="order-chip">${escapeHtml(order.order_number)}</span><time>${dateTime(order.created_at)}</time></div><span class="order-payment ${escapeHtml(order.status)}">${escapeHtml(paymentCopy[order.status] || order.status)}</span></header><div class="order-main"><div class="shipment-progress"><div class="progress-ring" style="--progress:${progress}"><strong>${progress}%</strong><span>đã đi</span></div><div><span class="order-kicker">${escapeHtml(shipmentCopy[order.shipment_status] || "Chờ cập nhật")}</span><h2>${escapeHtml(order.shipment_location || "Đơn hàng đang được chuẩn bị")}</h2><p>${escapeHtml(order.shipment_note || order.shipping_note || "Nhà vận chuyển sẽ cập nhật vị trí sau khi nhận hàng.")}</p></div></div><aside class="carrier-card"><span>ĐƠN VỊ GIAO HÀNG</span><div class="carrier-name">${carrierMark}<b>${escapeHtml(carrier?.name || order.carrier || "Chưa phân công")}</b></div>${order.tracking_code ? `<code>${escapeHtml(order.tracking_code)}</code>${trackingUrl ? `<a href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener">Tra cứu vận đơn <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}` : `<small>Chưa có mã vận đơn</small>`}</aside></div><div class="order-products">${(order.order_items || []).map((item) => `<span>${escapeHtml(item.product_name)} <b>×${item.quantity}</b></span>`).join("")}<strong>${money(order.total_amount)}</strong></div><div class="order-actions">${paymentAction}${order.zalo_confirmation_requested_at ? `<small><i class="fa-solid fa-clock"></i> Đã gửi yêu cầu xác nhận lúc ${dateTime(order.zalo_confirmation_requested_at)}</small>` : ""}</div><details class="order-details"><summary>Chi tiết hành trình &amp; nơi hàng đã đến <i class="fa-solid fa-chevron-down"></i></summary><div class="timeline">${events.length ? events.map((event, index) => `<article class="timeline-event ${index === 0 ? "latest" : ""}"><span></span><div><b>${escapeHtml(shipmentCopy[event.shipment_status] || event.shipment_status)}</b><time>${dateTime(event.occurred_at)}</time><p>${escapeHtml(event.location || "Chưa có vị trí")} ${event.note ? `· ${escapeHtml(event.note)}` : ""}</p></div><strong>${Number(event.progress || 0)}%</strong></article>`).join("") : '<p class="timeline-empty">Chưa có mốc hành trình. Vị trí và tiến trình sẽ hiển thị sau khi bộ phận giao nhận cập nhật.</p>'}</div><div class="delivery-address"><span>ĐỊA CHỈ NHẬN</span><p>${escapeHtml(order.shipping_address || "Chưa cập nhật địa chỉ")}</p></div></details></article>`;
}

async function requestPaymentConfirmation(event) {
  const button = event.currentTarget; button.disabled = true; const { data, error } = await db.rpc("request_order_payment_confirmation", { p_order_id: button.dataset.paymentConfirm }); button.disabled = false;
  if (error) return toast(error.message, "error");
  const message = String(settings?.zalo_confirmation_message || "Tôi đã chuyển khoản đơn {order_number} với số tiền {total}. Nhờ shop xác nhận giúp tôi.").replaceAll("{order_number}", button.dataset.orderNumber).replaceAll("{total}", money(button.dataset.total));
  try { await navigator.clipboard.writeText(message); } catch { /* Người dùng vẫn nhìn thấy thông báo hướng dẫn. */ }
  const phone = String(settings?.zalo_phone || "").replace(/\D/g, "").replace(/^0/, "84");
  if (phone) window.open(`https://zalo.me/${phone}`, "_blank", "noopener");
  toast("Đã gửi yêu cầu xác nhận. Nội dung Zalo đã được sao chép; shop sẽ đối soát trước khi đánh dấu đã thanh toán.", "success");
  if (data) loadOrders();
}

function showError(message) { $("#ordersLoading").hidden = true; $("#ordersList").innerHTML = `<article class="orders-empty error"><i class="fa-solid fa-triangle-exclamation"></i><h2>Chưa thể đồng bộ</h2><p>${escapeHtml(message)}</p><button type="button" onclick="location.reload()">Thử lại</button></article>`; }
function toast(message, type) { const node = document.createElement("div"); node.className = `toast ${type}`; node.textContent = message; $("#ordersToast").append(node); setTimeout(() => node.remove(), 5000); }
