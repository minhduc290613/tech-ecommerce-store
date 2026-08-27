/* Circuit Atelier Command Deck — RLS-bound marketplace operations and CMS. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { isAdminRole, resolveRoleCapabilities } from "./role-permissions.js";
import { filterOrders } from "./order-filters.js";
import { canAdminConfirmPayment, getManualTransferReviewQueue } from "./transfer-payment-review.js";
import { getAdminAccessMessage } from "./admin-access-state.js";
import { canCancelPendingOrder, cancellationReason } from "./order-cancellation.js";
import { normalizeProductGallery, productGalleryUrls } from "./product-gallery.js";
import "./admin-transfer-payments.css";
import "./admin-product-gallery.css";
import "./admin-order-action-labels.css";
import "./admin-order-archive.css";
import "./admin-sale-usage-history.css";
import "./admin-accounts.js";
import "./admin-email-delivery.js";
import "./admin-roles-content.js";
import "./admin-logistics.js";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.nexoraAdminDb = db;
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const state = {
  user: null, role: "customer", isAdmin: false, roleDefinitions: [], capabilities: {}, products: [], productImages: [], editingProductGallery: [], orders: [], archivedOrders: [], saleUsageOrders: [], settings: null, pages: [], faqs: [], shops: [], saleCampaigns: [],
  fulfillmentFilter: "all", paymentFilter: "all", orderQuery: "", carrierFilter: "all", archivedOrderQuery: "", saleUsageCampaignId: "", pendingOrderAction: null, activeOrderId: null, editingProductId: null, editingFaqId: null, editingShopId: null, editingSaleCampaignId: null,
};
let clearingExpiredAdminSession = false;

const els = {
  gate: $("#adminGate"), gateMessage: $("#gateMessage"), loginForm: $("#adminLoginForm"), loginEmail: $("#adminEmail"), loginPassword: $("#adminPassword"), loginButton: $("#adminLoginButton"), app: $("#adminApp"),
  operatorName: $("#operatorName"), operatorInitial: $("#operatorInitial"), signOut: $("#adminSignOut"), viewTitle: $("#viewTitle"),
  metricRevenue: $("#metricRevenue"), metricOrders: $("#metricOrders"), metricProducts: $("#metricProducts"), metricPending: $("#metricPending"), metricSale: $("#metricSale"), recentOrders: $("#recentOrdersBody"),
  productCount: $("#adminProductCount"), productSearch: $("#adminProductSearch"), productsBody: $("#productsTableBody"), newProduct: $("#newProductButton"),
  refreshOrders: $("#refreshOrdersButton"), ordersBody: $("#ordersTableBody"), fulfillmentFilters: $("#orderFulfillmentFilters"), paymentFilter: $("#orderPaymentFilter"),
  settingsForm: $("#settingsForm"), pageForm: $("#pageForm"), pageSelect: $("#pageSelect"), faqBody: $("#faqTableBody"), faqCount: $("#faqCount"), newFaq: $("#newFaqButton"), shopsBody: $("#shopsTableBody"), newShop: $("#newShopButton"), toastRegion: $("#adminToastRegion"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  if (!db) {
    els.gateMessage.textContent = "Hãy điền SUPABASE_URL và SUPABASE_ANON_KEY trong supabase-config.js trước khi đăng nhập.";
    return;
  }
  const { data, error } = await db.auth.getSession();
  if (error || !data.session?.user) {
    clearingExpiredAdminSession = true;
    await db.auth.signOut({ scope: "local" });
    showGate(getAdminAccessMessage({ sessionError: error?.message || "no_session" }));
  } else await verifyAdmin(data.session.user);
  db.auth.onAuthStateChange((_event, session) => {
    if (session?.user) { clearingExpiredAdminSession = false; return; }
    showGate(clearingExpiredAdminSession ? getAdminAccessMessage({ sessionError: "expired" }) : getAdminAccessMessage());
  });
}

function bindEvents() {
  els.loginForm.addEventListener("submit", login);
  els.signOut.addEventListener("click", signOut);
  mountTechnicalSpecsEditor(); mountContactSettingsFields(); mountFooterSettingsFields(); mountEnglishBrandContentFields(); mountEnglishPageContentFields(); mountBrandAssetUploads(); mountContentImageUploads(); mountProductGalleryEditor(); mountOrderCancellationControls(); mountOrderActionConfirmation(); mountArchivedOrderHistory(); mountSaleAdminUI(); mountSaleUsageHistory(); mountProductShopSelector();
  $$(".admin-nav button[data-view]").forEach((button) => button.addEventListener("click", () => activateView(button.dataset.view)));
  $$('[data-view-jump]').forEach((button) => button.addEventListener("click", () => activateView(button.dataset.viewJump)));
  els.newProduct.addEventListener("click", () => openProductModal());
  els.productSearch.addEventListener("input", renderProducts);
  els.productsBody.addEventListener("click", (event) => {
    const salesButton = event.target.closest("[data-sales-action]");
    if (salesButton) { updateSalesState(salesButton.dataset.productId, salesButton.dataset.salesAction); return; }
    const button = event.target.closest("[data-edit-product]"); if (button) openProductModal(getProduct(button.dataset.editProduct));
  });
  $("#productForm").addEventListener("submit", saveProduct);
  $("#deleteProductButton").addEventListener("click", deleteProduct);
  $("#productName").addEventListener("input", suggestSku);
  $("#productImageUrl").addEventListener("input", () => { updateProductPreview(); renderAdminProductGallery(); });
  $("#productImagePreview").addEventListener("error", () => hideProductPreview("Không tải được ảnh"));
  els.fulfillmentFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fulfillment-filter]"); if (!button) return;
    state.fulfillmentFilter = button.dataset.fulfillmentFilter;
    $$("button", els.fulfillmentFilters).forEach((item) => item.classList.toggle("active", item === button));
    renderOrders();
  });
  els.paymentFilter.addEventListener("change", () => { state.paymentFilter = els.paymentFilter.value; renderOrders(); });
  mountAdvancedOrderFilters(); mountTransferPaymentReview();
  $("#transferPaymentQueue")?.addEventListener("click", (event) => { const button = event.target.closest("[data-transfer-confirm]"); if (button) updatePaymentStatus(button.dataset.transferConfirm, "paid"); });
  $("#focusTransferPaymentQueue")?.addEventListener("click", () => { state.paymentFilter = "pending_payment"; els.paymentFilter.value = "pending_payment"; renderOrders(); $("#transferPaymentReview")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  els.ordersBody.addEventListener("click", (event) => { const paymentButton = event.target.closest("[data-payment-action]"); if (paymentButton) { updatePaymentStatus(paymentButton.dataset.orderId, paymentButton.dataset.paymentAction); return; } const cancelButton = event.target.closest("[data-cancel-order]"); if (cancelButton) { cancelOrderAsManager(cancelButton.dataset.cancelOrder); return; } const archiveButton = event.target.closest("[data-archive-order]"); if (archiveButton) { archiveCancelledOrder(archiveButton.dataset.archiveOrder); return; } const button = event.target.closest("[data-edit-order]"); if (button) openOrderModal(getOrder(button.dataset.editOrder)); });
  els.refreshOrders.addEventListener("click", loadData);
  $("#orderForm").addEventListener("submit", saveOrder);
  $("#cancelOrderButton")?.addEventListener("click", () => cancelOrderAsManager(state.activeOrderId));
  els.settingsForm.addEventListener("submit", saveSettings);
  els.pageSelect.addEventListener("change", fillPageForm);
  els.pageForm.addEventListener("submit", savePage);
  els.newFaq.addEventListener("click", () => openFaqModal());
  els.faqBody.addEventListener("click", (event) => { const button = event.target.closest("[data-edit-faq]"); if (button) openFaqModal(state.faqs.find((item) => item.id === button.dataset.editFaq)); });
  $("#faqForm").addEventListener("submit", saveFaq);
  $("#deleteFaqButton").addEventListener("click", deleteFaq);
  els.newShop.addEventListener("click", () => openShopModal());
  els.shopsBody.addEventListener("click", (event) => { const button = event.target.closest("[data-edit-shop]"); if (button) openShopModal(state.shops.find((item) => item.id === button.dataset.editShop)); });
  $("#shopForm").addEventListener("submit", saveShop);
  $("#deleteShopButton").addEventListener("click", deleteShop);
  $$('[data-close-modal]').forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
  $$(".admin-modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal.id.replace("Modal", "")); }));
}

function mountProductShopSelector() {
  if ($("#productShopId")) return;
  const categoryField = $("#productCategory")?.closest("label");
  if (!categoryField) return;
  categoryField.insertAdjacentHTML("afterend", '<label>Gian hàng<select id="productShopId"><option value="">Chưa gán gian hàng</option></select></label>');
}

function mountProductGalleryEditor() { if ($("#adminProductGallery")) return; const imageField = $("#productImageUrl")?.closest("label"); if (!imageField) return; imageField.insertAdjacentHTML("afterend", '<section class="admin-product-gallery" id="adminProductGallery"><header><h4>GALLERY ẢNH SẢN PHẨM</h4><small id="productGalleryCount">0/8 ảnh</small></header><div class="admin-product-gallery-add"><input id="productGalleryUrl" type="url" placeholder="Dán URL HTTPS ảnh bổ sung" /><button class="quiet-button" id="addProductGalleryUrl" type="button"><i class="fa-solid fa-link"></i> Thêm URL</button><input id="productGalleryUpload" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" hidden /><button class="quiet-button" id="uploadProductGallery" type="button"><i class="fa-solid fa-cloud-arrow-up"></i> Tải ảnh</button></div><div class="admin-product-gallery-list" id="productGalleryList"></div><div class="admin-product-gallery-actions"><small>Ảnh đầu tiên là ảnh chính. Chọn một ảnh để đặt làm ảnh chính; tối đa 8 ảnh.</small></div></section>'); $("#addProductGalleryUrl").addEventListener("click", addProductGalleryUrl); $("#uploadProductGallery").addEventListener("click", () => $("#productGalleryUpload").click()); $("#productGalleryUpload").addEventListener("change", uploadProductGalleryImage); $("#productGalleryList").addEventListener("click", handleProductGalleryAction); renderAdminProductGallery(); }
function currentProductGallery() { return normalizeProductGallery($("#productImageUrl")?.value, state.editingProductGallery); }
function renderAdminProductGallery() { const list = $("#productGalleryList"); if (!list) return; const images = currentProductGallery(); $("#productGalleryCount").textContent = `${images.length}/8 ảnh`; list.innerHTML = images.map((url, index) => `<article class="admin-gallery-tile"><img src="${escapeHtml(url)}" alt="Ảnh sản phẩm ${index + 1}" /><b>${index === 0 ? "ẢNH CHÍNH" : `ẢNH ${index + 1}`}</b>${index > 0 ? `<button type="button" data-remove-gallery-image="${index}" aria-label="Xóa ảnh ${index + 1}"><i class="fa-solid fa-xmark"></i></button>` : ""}<button type="button" data-primary-gallery-image="${index}" aria-label="Đặt ảnh ${index + 1} làm ảnh chính"><i class="fa-solid fa-star"></i></button></article>`).join(""); }
function addProductGalleryUrl() { const input = $("#productGalleryUrl"); const url = input.value.trim(); if (!/^https:\/\//i.test(url)) return toast("Ảnh gallery phải dùng URL HTTPS.", "error"); if (!$("#productImageUrl").value.trim()) { $("#productImageUrl").value = url; input.value = ""; updateProductPreview(); return renderAdminProductGallery(); } const next = normalizeProductGallery($("#productImageUrl").value, [...state.editingProductGallery, url]); if (next.length === currentProductGallery().length) return toast("Ảnh đã tồn tại hoặc gallery đã đủ 8 ảnh.", "error"); state.editingProductGallery = next.slice(1); input.value = ""; renderAdminProductGallery(); }
function handleProductGalleryAction(event) { const remove = event.target.closest("[data-remove-gallery-image]"); if (remove) { const index = Number(remove.dataset.removeGalleryImage); const images = currentProductGallery(); state.editingProductGallery = images.filter((_, itemIndex) => itemIndex !== index).slice(1); return renderAdminProductGallery(); } const primary = event.target.closest("[data-primary-gallery-image]"); if (!primary) return; const index = Number(primary.dataset.primaryGalleryImage); const images = currentProductGallery(); const selected = images[index]; images.splice(index, 1); $("#productImageUrl").value = selected; state.editingProductGallery = images; updateProductPreview(); renderAdminProductGallery(); }
async function uploadProductGalleryImage(event) { const input = event.currentTarget; const file = input.files?.[0]; const button = $("#uploadProductGallery"); if (!file || !button || !db) return; const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]); if (!allowed.has(file.type) || file.size > 5242880) { input.value = ""; return toast("Chỉ nhận PNG, JPG, WEBP hoặc SVG tối đa 5 MB.", "error"); } const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"; const path = `products/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`; setLoading(button, true, "Đang upload"); const { error } = await db.storage.from("nexora-brand-assets").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false }); setLoading(button, false); input.value = ""; if (error) return toast(`Không upload được ảnh: ${error.message}`, "error"); const { data } = db.storage.from("nexora-brand-assets").getPublicUrl(path); if (!$("#productImageUrl").value.trim()) { $("#productImageUrl").value = data.publicUrl; updateProductPreview(); renderAdminProductGallery(); return toast("Đã đặt ảnh đầu tiên làm ảnh chính. Hãy lưu sản phẩm để áp dụng.", "success"); } const next = normalizeProductGallery($("#productImageUrl").value, [...state.editingProductGallery, data.publicUrl]); if (next.length === currentProductGallery().length) return toast("Gallery đã đủ 8 ảnh.", "error"); state.editingProductGallery = next.slice(1); renderAdminProductGallery(); toast("Đã thêm ảnh. Hãy lưu sản phẩm để áp dụng.", "success"); }

function mountOrderCancellationControls() {
  $("#orderPaymentStatus option[value='cancelled']")?.remove();
  if ($("#cancelOrderButton")) return;
  $("#saveOrderButton")?.insertAdjacentHTML("beforebegin", '<button class="action-button danger" id="cancelOrderButton" type="button" hidden><i class="fa-solid fa-ban"></i> Hủy đơn</button>');
}

function populateProductShopOptions(selectedId = "") {
  const select = $("#productShopId");
  if (!select) return;
  select.innerHTML = `<option value="">Chưa gán gian hàng</option>${state.shops.map((shop) => `<option value="${escapeHtml(shop.id)}">${escapeHtml(shop.name)}${shop.is_active ? "" : " (ẩn)"}</option>`).join("")}`;
  select.value = selectedId || "";
}

async function login(event) {
  event.preventDefault();
  const email = els.loginEmail.value.trim(); const password = els.loginPassword.value;
  if (!email || !password) return toast("Nhập email và mật khẩu để tiếp tục.", "error");
  setLoading(els.loginButton, true, "Đang xác thực");
  await db.auth.signOut({ scope: "local" });
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  setLoading(els.loginButton, false);
  if (error) return toast(error.message, "error");
  await verifyAdmin(data.user);
}

async function verifyAdmin(user) {
  const [{ data: allowed, error }, { data: roleData }, { data: isAdmin }, roleDefinitionsResult] = await Promise.all([db.rpc("can_access_command_deck"), db.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(), db.rpc("is_admin"), db.from("role_definitions").select("role_key,display_name,capabilities").order("role_key")]);
  const resolvedRole = roleData?.role || (isAdmin ? "admin" : "customer");
  if (error || !allowed) { await db.auth.signOut({ scope: "local" }); return showGate(getAdminAccessMessage({ authorizationError: error?.message, allowed })); }
  state.user = user;
  state.isAdmin = Boolean(isAdmin);
  state.role = resolvedRole;
  state.roleDefinitions = roleDefinitionsResult.data || [];
  state.capabilities = Boolean(isAdmin) ? { commandDeck: true, articles: true, moderation: true, orders: true, roles: true, siteSettings: true } : resolveRoleCapabilities(resolvedRole, state.roleDefinitions);
  const displayRole = state.roleDefinitions.find((item) => item.role_key === resolvedRole)?.display_name || resolvedRole;
  els.operatorName.textContent = `${user.email || "Operator"} · ${displayRole}`;
  els.operatorInitial.textContent = (user.email || "A")[0].toUpperCase();
  els.gate.hidden = true; els.app.hidden = false;
  applyRoleVisibility();
  window.dispatchEvent(new CustomEvent("nexora:operator-ready", { detail: { user, role: state.role, isAdmin: Boolean(isAdmin), capabilities: state.capabilities, roleDefinitions: state.roleDefinitions } }));
  if (isAdmin) window.dispatchEvent(new Event("nexora:admin-ready"));
  await loadData();
}

function applyRoleVisibility() {
  const isAdmin = state.isAdmin || isAdminRole(state.role); const canOrders = isAdmin || Boolean(state.capabilities.orders);
  const canModerate = isAdmin || Boolean(state.capabilities.moderation) || Boolean(state.capabilities.roles);
  const canMarketing = isAdmin || Boolean(state.capabilities.articles);
  const canSettings = isAdmin || Boolean(state.capabilities.siteSettings);
  const hide = (view, hidden) => { const nav = $(`.admin-nav [data-view="${view}"]`); const section = $(`[data-admin-view="${view}"]`); if (nav) nav.hidden = hidden; if (section) section.hidden = hidden; };
  hide("products", !isAdmin); hide("brand", !canSettings); hide("shops", !isAdmin); hide("sale-campaigns", !isAdmin); hide("orders", !canOrders); hide("content", !canMarketing);
  $("#archivedOrderHistory")?.toggleAttribute("hidden", !state.isAdmin);
  if (!isAdmin && !canOrders && !canModerate && !canMarketing && !canSettings) hide("overview", true);
}

async function signOut() { if (db) await db.auth.signOut(); showGate("Bạn đã đăng xuất khỏi Command Deck."); }
function showGate(message) { state.user = null; state.isAdmin = false; state.archivedOrders = []; state.pendingOrderAction = null; els.app.hidden = true; els.gate.hidden = false; els.gateMessage.textContent = message; els.loginPassword.value = ""; }

async function loadData() {
  setTableLoading();
  const [productsResult, productImagesResult, ordersResult, archivedOrdersResult, saleUsageOrdersResult, settingsResult, pagesResult, faqsResult, shopsResult, campaignsResult] = await Promise.all([
    db.from("products").select("*").order("created_at", { ascending: false }),
    db.from("product_images").select("product_id,image_url,sort_order").order("sort_order"),
    db.from("orders").select("id,order_number,user_id,subtotal_amount,discount_amount,sale_campaign_id,sale_code,total_amount,status,payment_method,auto_transfer_provider,payment_note,payment_confirmed_at,payment_confirmation_note,zalo_confirmation_requested_at,customer_name,customer_phone,shipping_address,shipping_note,fulfillment_status,carrier,tracking_code,admin_note,fulfillment_updated_at,delivered_at,created_at,updated_at,order_items(product_name,unit_price,quantity,subtotal)").is("archived_at", null).order("created_at", { ascending: false }),
    state.isAdmin ? db.from("orders").select("id,order_number,total_amount,status,archived_at,archived_by,archive_reason,created_at,order_items(product_name,quantity)").not("archived_at", "is", null).order("archived_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    state.isAdmin ? db.from("orders").select("id,order_number,sale_campaign_id,sale_code,subtotal_amount,discount_amount,total_amount,status,created_at,archived_at").or("sale_campaign_id.not.is.null,sale_code.not.is.null").order("created_at", { ascending: false }).limit(250) : Promise.resolve({ data: [], error: null }),
    db.from("site_settings").select("*").eq("singleton", true).maybeSingle(),
    db.from("site_pages").select("*").order("slug"),
    db.from("faqs").select("*").order("sort_order"),
    db.from("shops").select("*").order("created_at", { ascending: false }),
    db.from("sale_campaigns").select("*").order("created_at", { ascending: false }),
  ]);
  if (productsResult.error || ordersResult.error || productImagesResult.error || archivedOrdersResult.error || saleUsageOrdersResult.error) return toast(productsResult.error?.message || productImagesResult.error?.message || ordersResult.error?.message || archivedOrdersResult.error?.message || saleUsageOrdersResult.error?.message || "Không tải được dữ liệu quản trị.", "error");
  state.productImages = productImagesResult.data || []; state.products = (productsResult.data || []).map((product) => ({ ...product, product_images: state.productImages.filter((image) => image.product_id === product.id) })); state.orders = ordersResult.data || []; state.archivedOrders = archivedOrdersResult.data || []; state.saleUsageOrders = saleUsageOrdersResult.data || []; refreshCarrierFilterOptions();
  if (settingsResult.error || pagesResult.error || faqsResult.error || shopsResult.error || campaignsResult.error) toast("CMS/sale chưa sẵn sàng. Hãy chạy các migration Supabase mới nhất.", "error");
  state.settings = settingsResult.data || null; state.pages = pagesResult.data || []; state.faqs = faqsResult.data || []; state.shops = shopsResult.data || []; state.saleCampaigns = campaignsResult.data || []; populateProductShopOptions($("#productShopId")?.value || "");
  renderMetrics(); renderOperationsMetrics(); renderRevenueChart(); renderProducts(); renderOrders(); renderArchivedOrderHistory(); renderRecentOrders(); renderSettings(); renderFaqs(); renderShops(); renderSaleCampaigns(); renderSaleUsageHistory(); fillPageForm();
}

function renderMetrics() {
  const revenue = state.orders.filter((order) => ["paid", "processing", "completed"].includes(order.status)).reduce((sum, order) => sum + Number(order.total_amount), 0);
  const pending = state.orders.filter((order) => order.status === "pending_payment").length;
  const sale = state.products.filter((product) => product.is_sale).length;
  els.metricRevenue.textContent = currency(revenue); els.metricOrders.textContent = String(state.orders.length).padStart(2, "0"); els.metricProducts.textContent = String(state.products.length).padStart(2, "0"); els.metricPending.textContent = `${pending} đơn chờ thanh toán`; els.metricSale.textContent = `${sale} sản phẩm có ưu đãi`;
}
function renderOperationsMetrics() {
  const paid = state.orders.filter((order) => ["paid", "processing", "completed"].includes(order.status));
  const revenue7d = paid.filter((order) => Date.now() - new Date(order.created_at).getTime() <= 7 * 86400000).reduce((sum, order) => sum + Number(order.total_amount), 0);
  const ready = state.orders.filter((order) => ["preparing", "ready_to_ship"].includes(order.fulfillment_status || "unfulfilled")).length;
  const delivered = state.orders.filter((order) => (order.fulfillment_status || "unfulfilled") === "delivered").length;
  $("#opsRevenue7d").textContent = currency(revenue7d); $("#opsPaidOrders").textContent = String(paid.length).padStart(2, "0"); $("#opsReadyToShip").textContent = String(ready).padStart(2, "0"); $("#opsDelivered").textContent = String(delivered).padStart(2, "0");
}
function renderRevenueChart() {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return { key: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date), value: 0 }; });
  state.orders.filter((order) => ["paid", "processing", "completed"].includes(order.status)).forEach((order) => { const bucket = days.find((day) => day.key === new Date(order.created_at).toISOString().slice(0, 10)); if (bucket) bucket.value += Number(order.total_amount); });
  const max = Math.max(1, ...days.map((day) => day.value)); const total = days.reduce((sum, day) => sum + day.value, 0);
  $("#revenueChart").innerHTML = days.map((day) => `<div class="chart-bar-wrap"><div class="chart-bar ${day.value ? "" : "zero"}" style="height:${Math.max(2, Math.round((day.value / max) * 100))}%" title="${escapeHtml(day.label)}: ${currency(day.value)}"></div><span class="chart-bar-label">${escapeHtml(day.label)}</span></div>`).join("");
  $("#revenueWindowTotal").textContent = currency(total); $("#revenueWindowCaption").textContent = total ? `Ghi nhận từ ${state.orders.filter((order) => ["paid", "processing", "completed"].includes(order.status)).length} đơn đã xác nhận trong cửa sổ 7 ngày.` : "Chưa có đơn thanh toán trong 7 ngày gần nhất.";
}
function renderRecentOrders() { els.recentOrders.innerHTML = state.orders.slice(0, 5).map(compactOrderRow).join("") || emptyRow("Chưa có đơn hàng nào.", 5); }
function compactOrderRow(order) { const label = order.payment_method === "momo" ? "MoMo" : order.payment_method === "zalopay" ? "ZaloPay" : order.payment_method === "wallet" ? "Số dư" : order.payment_method === "auto_transfer" ? `CK tự động · ${{ sepay: "SePay", casso: "Casso", vietqr: "VietQR" }[order.auto_transfer_provider] || "—"}` : "VietQR"; return `<tr><td><b>${escapeHtml(order.order_number)}</b></td><td>${formatDate(order.created_at)}</td><td>${label}</td><td><b>${currency(order.total_amount)}</b></td><td><span class="fulfillment-pill fulfillment-${escapeHtml(order.fulfillment_status || "unfulfilled")}">${fulfillmentLabel(order.fulfillment_status)}</span></td></tr>`; }
function renderOrders() {
  const rows = filterOrders(state.orders, { query: state.orderQuery, carrier: state.carrierFilter, fulfillment: state.fulfillmentFilter, payment: state.paymentFilter });
  $("#orderFilterCount").textContent = `${rows.length}/${state.orders.length} đơn`;
  els.ordersBody.innerHTML = rows.map(orderRow).join("") || emptyRow("Không tìm thấy đơn phù hợp với điều kiện tra cứu.", 8);
  renderTransferPaymentQueue();
}

function mountArchivedOrderHistory() {
  if ($("#archivedOrderHistory")) return;
  const ordersPanel = els.ordersBody?.closest(".orders-panel"); if (!ordersPanel) return;
  ordersPanel.insertAdjacentHTML("afterend", '<section class="admin-panel archived-order-history" id="archivedOrderHistory" hidden><div class="panel-top archived-order-head"><div><span class="panel-label">ARCHIVE LEDGER</span><h3>Lịch sử đơn đã lưu trữ</h3><p>Chỉ Admin xem được. Các đơn ở đây đã được loại khỏi danh sách vận hành, nhưng vẫn giữ bản ghi đối soát và không thể khôi phục từ giao diện.</p></div><span class="archive-count" id="archivedOrderCount">0 ĐƠN LƯU TRỮ</span></div><div class="archive-filter-row"><label class="table-search"><i class="fa-solid fa-magnifying-glass"></i><input id="archivedOrderSearch" type="search" placeholder="Tìm theo mã đơn hoặc ghi chú lưu trữ..." /></label><span class="archive-filter-count" id="archivedOrderFilterCount">0/0 đơn</span></div><div class="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Giá trị</th><th>Sản phẩm</th><th>Lưu trữ lúc</th><th>Người lưu</th><th>Ghi chú</th></tr></thead><tbody id="archivedOrdersTableBody"></tbody></table></div></section>');
  $("#archivedOrderSearch")?.addEventListener("input", (event) => { state.archivedOrderQuery = event.target.value; renderArchivedOrderHistory(); });
}

function renderArchivedOrderHistory() {
  const panel = $("#archivedOrderHistory"); const body = $("#archivedOrdersTableBody"); const count = $("#archivedOrderCount"); const filteredCount = $("#archivedOrderFilterCount");
  if (!panel || !body || !count || !filteredCount) return;
  panel.hidden = !state.isAdmin;
  if (!state.isAdmin) return;
  const query = normalize(state.archivedOrderQuery);
  const rows = state.archivedOrders.filter((order) => !query || normalize(`${order.order_number || ""} ${order.archive_reason || ""}`).includes(query));
  count.textContent = `${state.archivedOrders.length} ĐƠN LƯU TRỮ`;
  filteredCount.textContent = `${rows.length}/${state.archivedOrders.length} đơn`;
  body.innerHTML = rows.map((order) => `<tr><td><b>${escapeHtml(order.order_number)}</b><br /><small class="archive-status"><i class="fa-solid fa-box-archive"></i> Đã lưu trữ</small></td><td><b>${currency(order.total_amount)}</b></td><td>${order.order_items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0} SP</td><td>${escapeHtml(formatDate(order.archived_at))}</td><td>${order.archived_by === state.user?.id ? "Bạn" : "Quản trị viên"}</td><td><span class="archive-reason">${escapeHtml(order.archive_reason || "Không có ghi chú")}</span></td></tr>`).join("") || emptyRow("Chưa có đơn nào được lưu trữ.", 6);
}

function mountTransferPaymentReview() {
  if ($("#transferPaymentReview")) return;
  const ordersPanel = els.ordersBody?.closest(".admin-panel"); if (!ordersPanel) return;
  ordersPanel.insertAdjacentHTML("beforebegin", '<section class="admin-panel transfer-review-panel" id="transferPaymentReview"><div class="panel-top"><div><span class="panel-label">BANK TRANSFER REVIEW</span><h3>Xác nhận chuyển khoản</h3><p>Chỉ xác nhận sau khi đối chiếu giao dịch ngân hàng. Thanh toán số dư không xuất hiện ở đây vì phải trừ ví bằng luồng của khách.</p></div><div><span class="transfer-review-count" id="transferPaymentCount">0 CHỜ ĐỐI SOÁT</span><button class="quiet-button" id="focusTransferPaymentQueue" type="button"><i class="fa-solid fa-filter"></i> Lọc đơn chờ</button></div></div><div class="transfer-payment-queue" id="transferPaymentQueue"></div></section>');
}

function renderTransferPaymentQueue() {
  const host = $("#transferPaymentQueue"); const count = $("#transferPaymentCount"); if (!host || !count) return;
  const queue = getManualTransferReviewQueue(state.orders); count.textContent = `${queue.length} CHỜ ĐỐI SOÁT`;
  host.innerHTML = queue.length ? queue.map((order) => {
    const customer = order.customer_name || shortId(order.user_id); const method = order.payment_method === "momo" ? "MoMo" : order.payment_method === "zalopay" ? "ZaloPay" : "VietQR";
    const requested = order.zalo_confirmation_requested_at ? `<span class="requested">KHÁCH ĐÃ GỬI YÊU CẦU · ${escapeHtml(formatDate(order.zalo_confirmation_requested_at))}</span>` : "<span>CHƯA CÓ YÊU CẦU ZALO</span>";
    return `<article class="transfer-queue-card"><div><h4>${escapeHtml(order.order_number)} · ${currency(order.total_amount)}</h4><p>${escapeHtml(customer)} · ${escapeHtml(order.customer_phone || "Chưa có số liên hệ")}</p><div class="transfer-queue-meta"><span>${method}</span>${requested}<span>TẠO ${escapeHtml(formatDate(order.created_at))}</span></div></div><button class="transfer-confirm-button" data-transfer-confirm="${escapeHtml(order.id)}" type="button"><i class="fa-solid fa-circle-check"></i> Xác nhận đã nhận CK</button></article>`;
  }).join("") : '<p class="transfer-queue-empty">Không có đơn chuyển khoản nào đang chờ đối soát.</p>';
}

function mountAdvancedOrderFilters() {
  if ($("#orderSearch")) return;
  const host = els.fulfillmentFilters?.closest(".fulfillment-filter-row"); if (!host) return;
  host.insertAdjacentHTML("afterend", '<div class="order-advanced-filters"><label class="table-search order-search"><i class="fa-solid fa-magnifying-glass"></i><input id="orderSearch" type="search" placeholder="Mã đơn, mã vận đơn, khách hàng, SĐT hoặc nhà vận chuyển..." /></label><select class="payment-filter" id="orderCarrierFilter" aria-label="Lọc nhà vận chuyển"><option value="all">Tất cả nhà vận chuyển</option></select><button class="quiet-button" id="focusCancelledOrders" type="button"><i class="fa-solid fa-ban"></i> Đơn đã hủy</button><button class="quiet-button" id="clearOrderFilters" type="button"><i class="fa-solid fa-filter-circle-xmark"></i> Xóa lọc</button><span id="orderFilterCount" class="order-filter-count">0/0 đơn</span></div>');
  document.head.insertAdjacentHTML("beforeend", '<style>.order-advanced-filters{display:flex;align-items:center;gap:.6rem;margin:0 0 1rem}.order-advanced-filters .order-search{flex:1;min-width:15rem}.order-filter-count{margin-left:auto;color:#91afc9;font:600 .65rem var(--font-mono);white-space:nowrap}@media(max-width:720px){.order-advanced-filters{align-items:stretch;flex-wrap:wrap}.order-advanced-filters .order-search{flex:1 0 100%}.order-advanced-filters select,.order-advanced-filters button{flex:1}.order-filter-count{width:100%;margin-left:0}}</style>');
  $("#orderSearch").addEventListener("input", (event) => { state.orderQuery = event.target.value; renderOrders(); });
  $("#orderCarrierFilter").addEventListener("change", (event) => { state.carrierFilter = event.target.value; renderOrders(); });
  $("#focusCancelledOrders").addEventListener("click", () => { state.paymentFilter = "cancelled"; els.paymentFilter.value = "cancelled"; renderOrders(); });
  $("#clearOrderFilters").addEventListener("click", () => { state.orderQuery = ""; state.carrierFilter = "all"; state.fulfillmentFilter = "all"; state.paymentFilter = "all"; $("#orderSearch").value = ""; $("#orderCarrierFilter").value = "all"; els.paymentFilter.value = "all"; $$("button", els.fulfillmentFilters).forEach((button) => button.classList.toggle("active", button.dataset.fulfillmentFilter === "all")); renderOrders(); });
}
function refreshCarrierFilterOptions() { const select = $("#orderCarrierFilter"); if (!select) return; const current = state.carrierFilter; const carriers = [...new Set(state.orders.map((order) => String(order.carrier || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")); select.innerHTML = `<option value="all">Tất cả nhà vận chuyển</option>${carriers.map((carrier) => `<option value="${escapeHtml(carrier)}">${escapeHtml(carrier)}</option>`).join("")}`; state.carrierFilter = carriers.some((carrier) => carrier === current) ? current : "all"; select.value = state.carrierFilter; }
function orderRow(order) {
  const customerName = order.customer_name || shortId(order.user_id); const itemCount = order.order_items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
  const sale = Number(order.discount_amount || 0) > 0 ? `<small class="sale-status-live">${escapeHtml(order.sale_code || "SALE")} · -${currency(order.discount_amount)}</small>` : "";
  const confirmation = order.payment_method === "auto_transfer" && order.status === "pending_payment" ? `<span class="customer-email">Chờ webhook ${{ sepay: "SePay", casso: "Casso", vietqr: "VietQR" }[order.auto_transfer_provider] || ""}</span>` : canAdminConfirmPayment(order) ? `<button class="payment-action transfer" data-payment-action="paid" data-order-id="${escapeHtml(order.id)}" type="button">Xác nhận CK</button>` : order.payment_method === "wallet" && order.status === "pending_payment" ? '<span class="customer-email">Chờ khách thanh toán ví</span>' : `<div class="payment-actions"><button class="payment-action pending ${order.status === "pending_payment" ? "active" : ""}" data-payment-action="pending_payment" data-order-id="${escapeHtml(order.id)}" type="button">Chưa TT</button><button class="payment-action paid ${order.status === "paid" ? "active" : ""}" data-payment-action="paid" data-order-id="${escapeHtml(order.id)}" type="button">Đã TT</button></div>`;
  const cancel = canCancelPendingOrder(order) ? `<button class="row-action danger order-row-action" data-cancel-order="${escapeHtml(order.id)}" type="button" title="Hủy đơn chưa thanh toán"><i class="fa-solid fa-ban"></i><span>Hủy đơn</span></button>` : "";
  const archive = order.status === "cancelled" ? `<button class="row-action order-row-action archive" data-archive-order="${escapeHtml(order.id)}" type="button" title="Xóa khỏi danh sách, giữ lịch sử"><i class="fa-solid fa-box-archive"></i><span>Xóa lưu trữ</span></button>` : "";
  return `<tr><td><b>${escapeHtml(order.order_number)}</b><br /><small class="customer-email">${escapeHtml(order.tracking_code || "Chưa có mã vận đơn")}</small></td><td><span class="order-customer"><b>${escapeHtml(customerName)}</b><small>${escapeHtml(order.customer_phone || "Chưa có số liên hệ")}</small></span></td><td>${formatDate(order.created_at)}</td><td><span class="status-pill status-${escapeHtml(order.status)}">${statusLabel(order.status)}</span></td><td>${confirmation}</td><td><span class="fulfillment-pill fulfillment-${escapeHtml(order.fulfillment_status || "unfulfilled")}">${fulfillmentLabel(order.fulfillment_status)}</span></td><td><b>${currency(order.total_amount)}</b><br />${sale}</td><td>${itemCount} SP</td><td><div class="row-actions">${cancel}${archive}<button class="row-action" data-edit-order="${escapeHtml(order.id)}" aria-label="Chỉnh sửa đơn ${escapeHtml(order.order_number)}"><i class="fa-solid fa-pen"></i></button></div></td></tr>`;
}

function renderProducts() {
  const query = normalize(els.productSearch.value);
  const products = state.products.filter((product) => normalize(`${product.name} ${product.category} ${product.sku || ""} ${product.brand || ""}`).includes(query));
  els.productCount.textContent = `${products.length} sản phẩm`;
  els.productsBody.innerHTML = products.map((product) => { const shop = state.shops.find((item) => item.id === product.shop_id); return `<tr><td><div class="product-cell"><img src="${escapeHtml(product.image_url)}" alt="" /><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.sku || product.slug)} · ${escapeHtml(product.brand || "NEXORA")}${shop ? ` · ${escapeHtml(shop.name)}` : " · Chưa gán gian hàng"}</small></span></div></td><td>${escapeHtml(product.category)}</td><td><b>${currency(product.price)}</b><br /><small>${product.warranty_months ?? 12} tháng BH</small></td><td>${product.stock}</td><td><span class="sale-pill ${product.is_sale ? "yes" : "no"}">${product.is_sale ? "SALE" : "STANDARD"}</span></td><td>${salesStateBadge(product)}</td><td><div class="sales-actions"><button class="sales-action ${product.is_active !== false && Number(product.stock) > 0 ? "is-active" : ""}" data-sales-action="selling" data-product-id="${escapeHtml(product.id)}" type="button" title="Mở bán" ${product.is_active !== false && Number(product.stock) > 0 ? "disabled" : ""}><i class="fa-solid fa-play"></i></button><button class="sales-action ${product.is_active === false ? "is-paused" : ""}" data-sales-action="paused" data-product-id="${escapeHtml(product.id)}" type="button" title="Ngừng bán" ${product.is_active === false ? "disabled" : ""}><i class="fa-solid fa-pause"></i></button><button class="sales-action ${product.is_active !== false && Number(product.stock) === 0 ? "is-out" : ""}" data-sales-action="out" data-product-id="${escapeHtml(product.id)}" type="button" title="Đánh dấu hết hàng" ${product.is_active !== false && Number(product.stock) === 0 ? "disabled" : ""}><i class="fa-solid fa-box-open"></i></button></div></td><td><button class="row-action" data-edit-product="${escapeHtml(product.id)}" aria-label="Chỉnh sửa ${escapeHtml(product.name)}"><i class="fa-solid fa-pen"></i></button></td></tr>`; }).join("") || emptyRow("Không tìm thấy sản phẩm.", 8);
}

function renderSettings() {
  if (!state.settings) return;
  const map = { "#settingSiteName": "site_name", "#settingTagline": "site_tagline", "#settingTaglineEn": "site_tagline_en", "#settingLogoUrl": "logo_url", "#settingFaviconUrl": "favicon_url", "#settingSeoTitle": "seo_title", "#settingSeoDescription": "seo_description", "#settingSeoOgImage": "seo_og_image_url", "#settingAnnouncement": "announcement_text", "#settingAnnouncementEn": "announcement_text_en", "#settingEmail": "support_email", "#settingSupportPhone": "support_phone", "#settingHours": "support_hours", "#settingAddress": "address_text", "#settingFooterCredit": "footer_credit_text", "#settingFooterStatus": "footer_status_text", "#settingZaloPhone": "zalo_phone", "#settingZaloLabel": "zalo_label", "#settingZaloMessage": "zalo_confirmation_message", "#settingSellerZaloPhone": "seller_zalo_phone", "#settingSellerContactLabel": "seller_contact_label", "#settingSellerContactMessage": "seller_contact_message", "#settingHeroKicker": "hero_kicker", "#settingHeroKickerEn": "hero_kicker_en", "#settingHeroTitle": "hero_title", "#settingHeroTitleEn": "hero_title_en", "#settingHeroEmphasis": "hero_emphasis", "#settingHeroEmphasisEn": "hero_emphasis_en", "#settingHeroDescription": "hero_description", "#settingHeroDescriptionEn": "hero_description_en", "#settingHeroImage": "hero_image_url" };
  Object.entries(map).forEach(([selector, key]) => { $(selector).value = state.settings[key] || ""; });
  $("#settingFooterStatusOnline").checked = state.settings.footer_status_online !== false;
}
function fillPageForm() { const page = state.pages.find((item) => item.slug === els.pageSelect.value); $("#pageTitle").value = page?.title || ""; $("#pageSubtitle").value = page?.subtitle || ""; $("#pageContent").value = page?.content || ""; $("#pageTitleEn").value = page?.title_en || ""; $("#pageSubtitleEn").value = page?.subtitle_en || ""; $("#pageContentEn").value = page?.content_en || ""; }
function renderFaqs() { els.faqCount.textContent = state.faqs.length; els.faqBody.innerHTML = state.faqs.map((faq) => `<tr><td><span class="list-name">${escapeHtml(faq.question)}</span><span class="list-description">${escapeHtml(faq.answer)}</span></td><td><input class="status-toggle" type="checkbox" disabled ${faq.is_published ? "checked" : ""} /></td><td><button class="row-action" data-edit-faq="${escapeHtml(faq.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Chưa có FAQ.", 3); }
function renderShops() { els.shopsBody.innerHTML = state.shops.map((shop) => `<tr><td><div class="product-cell">${shop.banner_url ? `<img class="image-mini" src="${escapeHtml(shop.banner_url)}" alt="" />` : ""}<span><b>${escapeHtml(shop.name)}</b><small>${escapeHtml(shop.slug)}</small></span></div></td><td>${escapeHtml(shop.category)}</td><td class="customer-email">${escapeHtml(shop.contact_email || "—")}</td><td><span class="shop-flag ${shop.is_verified ? "" : "muted"}"><i class="fa-solid fa-circle-check"></i>${shop.is_verified ? "Verified" : "Chưa xác minh"}</span></td><td><span class="sale-pill ${shop.is_active ? "yes" : "no"}">${shop.is_active ? "ACTIVE" : "HIDDEN"}</span></td><td><button class="row-action" data-edit-shop="${escapeHtml(shop.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Chưa có gian hàng.", 6); }

function openProductModal(product = null) {
  state.editingProductId = product?.id || null;
  state.editingProductGallery = productGalleryUrls(product).slice(1);
  $("#productForm").reset();
  $("#productModalTitle").textContent = product ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm mới";
  $("#deleteProductButton").classList.toggle("hidden", !product);
  $("#productBrand").value = product?.brand || "NEXORA";
  $("#productWarranty").value = product?.warranty_months ?? 12;
  $("#productActive").checked = product?.is_active !== false;
  populateProductShopOptions(product?.shop_id || "");
  if (product) {
    $("#productId").value = product.id; $("#productName").value = product.name; $("#productSku").value = product.sku || "";
    $("#productCategory").value = product.category; $("#productStock").value = product.stock; $("#productDescription").value = product.description;
    $("#productImageUrl").value = product.image_url; $("#productPrice").value = product.price; $("#productOriginalPrice").value = product.original_price;
    $("#productSale").checked = product.is_sale; $("#productFeatured").checked = product.featured;
  }
  setTechnicalSpecs(product?.technical_specs || {}); renderAdminProductGallery();
  updateProductPreview(); openModal("product");
}
function openFaqModal(faq = null) { state.editingFaqId = faq?.id || null; $("#faqForm").reset(); $("#deleteFaqButton").classList.toggle("hidden", !faq); $("#faqModalTitle").textContent = faq ? "Chỉnh sửa FAQ" : "Thêm FAQ"; if (faq) { $("#faqId").value = faq.id; $("#faqQuestion").value = faq.question; $("#faqAnswer").value = faq.answer; $("#faqQuestionEn").value = faq.question_en || ""; $("#faqAnswerEn").value = faq.answer_en || ""; $("#faqSortOrder").value = faq.sort_order; $("#faqPublished").checked = faq.is_published; } openModal("faq"); }
function openShopModal(shop = null) { state.editingShopId = shop?.id || null; $("#shopForm").reset(); $("#deleteShopButton").classList.toggle("hidden", !shop); $("#shopModalTitle").textContent = shop ? "Chỉnh sửa gian hàng" : "Thêm gian hàng"; if (shop) { $("#shopId").value = shop.id; $("#shopName").value = shop.name; $("#shopCategory").value = shop.category; $("#shopEmail").value = shop.contact_email || ""; $("#shopDescription").value = shop.description; $("#shopBannerUrl").value = shop.banner_url || ""; $("#shopZaloPhone").value = shop.zalo_phone || ""; $("#shopZaloLabel").value = shop.zalo_label || "Liên hệ gian hàng"; $("#shopVerified").checked = shop.is_verified; $("#shopActive").checked = shop.is_active; } openModal("shop"); }
function openOrderModal(order) {
  if (!order) return; state.activeOrderId = order.id; $("#orderModalTitle").textContent = `Đơn ${order.order_number}`;
  $("#orderId").value = order.id; $("#orderNumber").value = order.order_number; $("#orderPaymentStatus").value = order.status;
  $("#orderCustomerName").value = order.customer_name || ""; $("#orderCustomerPhone").value = order.customer_phone || ""; $("#orderShippingAddress").value = order.shipping_address || ""; $("#orderShippingNote").value = order.shipping_note || "";
  $("#orderPaymentConfirmationNote").value = order.payment_confirmation_note || ""; $("#orderFulfillmentStatus").value = order.fulfillment_status || "unfulfilled"; $("#orderCarrier").value = order.carrier || ""; $("#orderTrackingCode").value = order.tracking_code || ""; $("#orderAdminNote").value = order.admin_note || "";
  $("#cancelOrderButton").hidden = !canCancelPendingOrder(order);
  populateOrderSaleCampaigns(order); updateOrderDiscountPreview(order);
  $("#orderItemsPreview").innerHTML = order.order_items?.length ? order.order_items.map((item) => `<div class="order-item-line"><span>${escapeHtml(item.product_name)} × ${item.quantity}</span><strong>${currency(item.subtotal)}</strong></div>`).join("") : '<div class="order-item-line"><span>Chưa có chi tiết sản phẩm</span></div>';
  openModal("order");
}
function openModal(name) { $("#" + name + "Modal").hidden = false; document.body.style.overflow = "hidden"; }
function closeModal(name) { $("#" + name + "Modal").hidden = true; document.body.style.overflow = ""; }

async function saveProduct(event) {
  event.preventDefault();
  const name = $("#productName").value.trim(); const sku = $("#productSku").value.trim().toUpperCase();
  const price = Number($("#productPrice").value); const originalPrice = Number($("#productOriginalPrice").value);
  if (!sku) return toast("Nhập mã SKU để quản lý sản phẩm.", "error");
  if (originalPrice < price) return toast("Giá gốc phải lớn hơn hoặc bằng giá hiện tại.", "error");
  const payload = {
    name, sku, slug: slugify(name), brand: $("#productBrand").value.trim() || "NEXORA", category: $("#productCategory").value,
    stock: Number($("#productStock").value), warranty_months: Number($("#productWarranty").value), description: $("#productDescription").value.trim(), image_url: $("#productImageUrl").value.trim(),
    price, original_price: originalPrice, shop_id: $("#productShopId").value || null, technical_specs: collectTechnicalSpecs(), is_active: $("#productActive").checked, is_sale: $("#productSale").checked, featured: $("#productFeatured").checked, updated_at: new Date().toISOString(),
  };
  setLoading($("#saveProductButton"), true, "Đang lưu");
  const result = state.editingProductId ? await db.from("products").update(payload).eq("id", state.editingProductId).select("id").single() : await db.from("products").insert(payload).select("id").single();
  setLoading($("#saveProductButton"), false);
  if (result.error) return toast(result.error.message, "error");
  const gallery = currentProductGallery(); const { error: galleryError } = await db.rpc("replace_product_gallery", { p_product_id: result.data.id, p_image_urls: gallery });
  if (galleryError) return toast(`Đã lưu sản phẩm nhưng chưa lưu gallery: ${galleryError.message}`, "error");
  closeModal("product"); toast(state.editingProductId ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm mới.", "success"); await loadData();
}
async function deleteProduct() { if (!state.editingProductId || !window.confirm("Xóa sản phẩm này?")) return; const { error } = await db.from("products").delete().eq("id", state.editingProductId); if (error) return toast(error.message, "error"); closeModal("product"); toast("Đã xóa sản phẩm.", "success"); loadData(); }
async function updateSalesState(productId, action) {
  const product = getProduct(productId); if (!product) return;
  let payload; let confirmation;
  if (action === "selling") {
    if (Number(product.stock) <= 0) return toast("Hãy cập nhật tồn kho lớn hơn 0 trước khi mở bán.", "error");
    payload = { is_active: true, updated_at: new Date().toISOString() }; confirmation = "Đã mở bán sản phẩm.";
  } else if (action === "paused") {
    payload = { is_active: false, updated_at: new Date().toISOString() }; confirmation = "Đã ngừng bán và ẩn sản phẩm khỏi storefront.";
  } else {
    payload = { is_active: true, stock: 0, updated_at: new Date().toISOString() }; confirmation = "Đã đánh dấu sản phẩm hết hàng.";
  }
  const { error } = await db.from("products").update(payload).eq("id", productId);
  if (error) return toast(error.message, "error");
  Object.assign(product, payload); renderProducts(); renderMetrics(); toast(confirmation, "success");
}
async function updateOrderStatus(event) { const select = event.target.closest("[data-order-id]"); if (!select) return; const { error } = await db.from("orders").update({ status: select.value }).eq("id", select.dataset.orderId); if (error) return toast(error.message, "error"); const order = state.orders.find((item) => item.id === select.dataset.orderId); if (order) order.status = select.value; renderMetrics(); renderOrders(); renderRecentOrders(); toast("Đã cập nhật trạng thái đơn.", "success"); }
async function updatePaymentStatus(orderId, status) {
  const order = getOrder(orderId); if (!order || order.status === status) return;
  if (status === "paid" && order.payment_method === "wallet") return toast("Đơn ví chỉ được xác nhận qua thao tác thanh toán số dư của khách để bảo toàn sổ cái.", "error");
  if (status === "paid" && order.payment_method === "auto_transfer") return toast("Đơn CK tự động chỉ được xác nhận bằng webhook đã xác thực, mã đơn và số tiền khớp.", "error");
  if (status === "paid" && canAdminConfirmPayment(order) && !window.confirm(`Xác nhận đã đối chiếu và nhận đủ ${currency(order.total_amount)} cho đơn ${order.order_number}? Thao tác này sẽ đánh dấu đơn Đã thanh toán.`)) return;
  const payload = { status, payment_confirmed_at: status === "paid" ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
  const { error } = await db.from("orders").update(payload).eq("id", orderId);
  if (error) return toast(error.message, "error");
  Object.assign(order, payload); renderMetrics(); renderOperationsMetrics(); renderRevenueChart(); renderOrders(); renderRecentOrders(); toast(status === "paid" ? "Đã xác nhận thanh toán." : "Đã chuyển đơn về trạng thái chưa thanh toán.", "success");
}

async function saveSettings(event) { event.preventDefault(); const fields = { site_name: "#settingSiteName", site_tagline: "#settingTagline", site_tagline_en: "#settingTaglineEn", logo_url: "#settingLogoUrl", favicon_url: "#settingFaviconUrl", seo_title: "#settingSeoTitle", seo_description: "#settingSeoDescription", seo_og_image_url: "#settingSeoOgImage", announcement_text: "#settingAnnouncement", announcement_text_en: "#settingAnnouncementEn", support_email: "#settingEmail", support_phone: "#settingSupportPhone", support_hours: "#settingHours", address_text: "#settingAddress", footer_credit_text: "#settingFooterCredit", footer_status_text: "#settingFooterStatus", zalo_phone: "#settingZaloPhone", zalo_label: "#settingZaloLabel", zalo_confirmation_message: "#settingZaloMessage", seller_zalo_phone: "#settingSellerZaloPhone", seller_contact_label: "#settingSellerContactLabel", seller_contact_message: "#settingSellerContactMessage", hero_kicker: "#settingHeroKicker", hero_kicker_en: "#settingHeroKickerEn", hero_title: "#settingHeroTitle", hero_title_en: "#settingHeroTitleEn", hero_emphasis: "#settingHeroEmphasis", hero_emphasis_en: "#settingHeroEmphasisEn", hero_description: "#settingHeroDescription", hero_description_en: "#settingHeroDescriptionEn", hero_image_url: "#settingHeroImage" }; const payload = { singleton: true, updated_at: new Date().toISOString() }; Object.entries(fields).forEach(([key, selector]) => { payload[key] = $(selector).value.trim() || null; }); payload.footer_status_online = $("#settingFooterStatusOnline").checked; const { error } = await db.from("site_settings").upsert(payload, { onConflict: "singleton" }); if (error) return toast(error.message, "error"); state.settings = { ...state.settings, ...payload }; toast("Đã lưu thương hiệu, credit và trạng thái storefront.", "success"); }
async function savePage(event) { event.preventDefault(); const payload = { slug: els.pageSelect.value, title: $("#pageTitle").value.trim(), subtitle: $("#pageSubtitle").value.trim(), content: $("#pageContent").value.trim(), title_en: $("#pageTitleEn").value.trim() || null, subtitle_en: $("#pageSubtitleEn").value.trim() || null, content_en: $("#pageContentEn").value.trim() || null, updated_at: new Date().toISOString() }; const { error } = await db.from("site_pages").upsert(payload, { onConflict: "slug" }); if (error) return toast(error.message, "error"); const index = state.pages.findIndex((item) => item.slug === payload.slug); if (index >= 0) state.pages[index] = payload; else state.pages.push(payload); toast("Đã lưu trang thông tin.", "success"); }
async function saveFaq(event) { event.preventDefault(); const payload = { question: $("#faqQuestion").value.trim(), answer: $("#faqAnswer").value.trim(), question_en: $("#faqQuestionEn").value.trim() || null, answer_en: $("#faqAnswerEn").value.trim() || null, sort_order: Number($("#faqSortOrder").value), is_published: $("#faqPublished").checked, updated_at: new Date().toISOString() }; const result = state.editingFaqId ? await db.from("faqs").update(payload).eq("id", state.editingFaqId) : await db.from("faqs").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("faq"); toast("Đã lưu FAQ.", "success"); loadData(); }
async function deleteFaq() { if (!state.editingFaqId || !window.confirm("Xóa FAQ này?")) return; const { error } = await db.from("faqs").delete().eq("id", state.editingFaqId); if (error) return toast(error.message, "error"); closeModal("faq"); toast("Đã xóa FAQ.", "success"); loadData(); }
async function saveShop(event) { event.preventDefault(); const name = $("#shopName").value.trim(); const payload = { name, slug: slugify(name), category: $("#shopCategory").value.trim(), contact_email: $("#shopEmail").value.trim() || null, description: $("#shopDescription").value.trim(), banner_url: $("#shopBannerUrl").value.trim() || null, zalo_phone: $("#shopZaloPhone").value.trim() || null, zalo_label: $("#shopZaloLabel").value.trim() || "Liên hệ gian hàng", is_verified: $("#shopVerified").checked, is_active: $("#shopActive").checked, updated_at: new Date().toISOString() }; const result = state.editingShopId ? await db.from("shops").update(payload).eq("id", state.editingShopId) : await db.from("shops").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("shop"); toast("Đã lưu gian hàng.", "success"); loadData(); }
async function deleteShop() { if (!state.editingShopId || !window.confirm("Xóa gian hàng này?")) return; const { error } = await db.from("shops").delete().eq("id", state.editingShopId); if (error) return toast(error.message, "error"); closeModal("shop"); toast("Đã xóa gian hàng.", "success"); loadData(); }
async function saveOrder(event) {
  event.preventDefault(); const order = getOrder(state.activeOrderId); if (!order) return;
  const fulfillment = $("#orderFulfillmentStatus").value;
  const paymentStatus = $("#orderPaymentStatus").value;
  if (paymentStatus === "paid" && order.payment_method === "auto_transfer") return toast("Không thể xác nhận thủ công đơn CK tự động. Chờ webhook đã xác thực.", "error");
  const selectedCampaign = state.saleCampaigns.find((campaign) => campaign.id === $("#orderSaleCampaign").value); const subtotal = Number(order.subtotal_amount ?? (Number(order.total_amount) + Number(order.discount_amount || 0))); const discount = calculateOrderDiscount(selectedCampaign, subtotal);
  const payload = { status: paymentStatus, payment_confirmation_note: $("#orderPaymentConfirmationNote").value.trim() || null, customer_name: $("#orderCustomerName").value.trim() || null, customer_phone: $("#orderCustomerPhone").value.trim() || null, shipping_address: $("#orderShippingAddress").value.trim() || null, shipping_note: $("#orderShippingNote").value.trim() || null, fulfillment_status: fulfillment, carrier: $("#orderCarrier").value.trim() || null, tracking_code: $("#orderTrackingCode").value.trim() || null, admin_note: $("#orderAdminNote").value.trim() || null, sale_campaign_id: selectedCampaign?.id || null, sale_code: selectedCampaign?.code || null, subtotal_amount: subtotal, discount_amount: discount, total_amount: subtotal - discount, updated_at: new Date().toISOString() };
  if (paymentStatus === "paid" && !order.payment_confirmed_at) payload.payment_confirmed_at = new Date().toISOString();
  if (paymentStatus === "pending_payment") payload.payment_confirmed_at = null;
  if (fulfillment !== (order.fulfillment_status || "unfulfilled")) payload.fulfillment_updated_at = new Date().toISOString();
  if (fulfillment === "delivered" && !order.delivered_at) payload.delivered_at = new Date().toISOString();
  if (fulfillment !== "delivered") payload.delivered_at = null;
  setLoading($("#saveOrderButton"), true, "Đang lưu"); const { error } = await db.from("orders").update(payload).eq("id", order.id); setLoading($("#saveOrderButton"), false);
  if (error) return toast(error.message, "error"); closeModal("order"); toast("Đã cập nhật đơn hàng.", "success"); await loadData();
}

function mountOrderActionConfirmation() {
  if ($("#orderActionConfirmModal")) return;
  document.body.insertAdjacentHTML("beforeend", '<section class="admin-modal" id="orderActionConfirmModal" role="dialog" aria-modal="true" aria-labelledby="orderActionConfirmTitle" hidden><div class="product-modal-card order-action-confirm-card"><button class="close-modal" id="closeOrderActionConfirm" type="button" aria-label="Đóng xác nhận thao tác đơn"><i class="fa-solid fa-xmark"></i></button><span class="signal-label"><span></span> ORDER SAFEGUARD</span><h2 id="orderActionConfirmTitle">Xác nhận thao tác</h2><p id="orderActionConfirmDescription"></p><div class="order-action-summary"><span>Mã đơn</span><strong id="orderActionConfirmNumber">—</strong><span>Giá trị</span><strong id="orderActionConfirmAmount">—</strong></div><form class="product-form" id="orderActionConfirmForm"><label id="orderActionReasonLabel">Ghi chú<textarea id="orderActionConfirmReason" maxlength="400" required></textarea></label><p class="order-action-warning" id="orderActionConfirmWarning"></p><div class="form-actions"><button class="quiet-button" id="cancelOrderActionConfirm" type="button">Quay lại</button><button class="action-button danger" id="submitOrderActionConfirm" type="submit">Xác nhận</button></div></form></div></section>');
  const close = () => { state.pendingOrderAction = null; closeModal("orderActionConfirm"); };
  $("#closeOrderActionConfirm").addEventListener("click", close); $("#cancelOrderActionConfirm").addEventListener("click", close);
  $("#orderActionConfirmModal").addEventListener("click", (event) => { if (event.target === $("#orderActionConfirmModal")) close(); });
  $("#orderActionConfirmForm").addEventListener("submit", submitOrderActionConfirmation);
}

function cancelOrderAsManager(orderId) { openOrderActionConfirmation("cancel", orderId); }
function archiveCancelledOrder(orderId) { openOrderActionConfirmation("archive", orderId); }

function openOrderActionConfirmation(action, orderId) {
  const order = getOrder(orderId);
  if (action === "cancel" && (!order || !canCancelPendingOrder(order))) return toast("Chỉ hủy được đơn chưa thanh toán và chưa vào giao nhận.", "error");
  if (action === "archive" && (!order || order.status !== "cancelled")) return toast("Chỉ xóa khỏi danh sách được đơn đã hủy.", "error");
  state.pendingOrderAction = { action, orderId: order.id };
  const isArchive = action === "archive";
  $("#orderActionConfirmTitle").textContent = isArchive ? "Xác nhận lưu trữ đơn" : "Xác nhận hủy đơn";
  $("#orderActionConfirmDescription").textContent = isArchive ? "Đơn sẽ không còn ở danh sách vận hành, nhưng dữ liệu đối soát vẫn được giữ lại trong lịch sử dành cho Admin." : "Chỉ đơn chưa thanh toán và chưa vào giao nhận mới có thể bị hủy. Lịch sử đơn sẽ được giữ lại.";
  $("#orderActionConfirmNumber").textContent = order.order_number; $("#orderActionConfirmAmount").textContent = currency(order.total_amount);
  $("#orderActionReasonLabel").firstChild.textContent = isArchive ? "Ghi chú lưu trữ" : "Lý do hủy đơn";
  $("#orderActionConfirmReason").value = isArchive ? "Đơn hủy được lưu trữ khỏi danh sách vận hành." : cancellationReason("manager");
  $("#orderActionConfirmWarning").textContent = isArchive ? "Không có thao tác xóa vĩnh viễn hoặc khôi phục từ màn hình này." : "Sau khi hủy, đơn không thể chuyển lại trạng thái thanh toán hoặc giao nhận.";
  $("#submitOrderActionConfirm").innerHTML = isArchive ? '<i class="fa-solid fa-box-archive"></i> Lưu trữ đơn' : '<i class="fa-solid fa-ban"></i> Hủy đơn';
  $("#submitOrderActionConfirm").classList.toggle("archive-confirm", isArchive);
  openModal("orderActionConfirm");
}

async function submitOrderActionConfirmation(event) {
  event.preventDefault(); const pending = state.pendingOrderAction; const order = pending && getOrder(pending.orderId); if (!pending || !order) return;
  const reason = $("#orderActionConfirmReason").value.trim(); const submit = $("#submitOrderActionConfirm"); const isArchive = pending.action === "archive";
  if (!reason) return toast(isArchive ? "Nhập ghi chú lưu trữ." : "Nhập lý do hủy đơn.", "error");
  setLoading(submit, true, isArchive ? "Đang lưu trữ" : "Đang hủy");
  const result = isArchive ? await db.rpc("archive_cancelled_order", { p_order_id: order.id, p_reason: reason }) : await db.rpc("cancel_order_as_manager", { p_order_id: order.id, p_reason: reason });
  setLoading(submit, false);
  if (result.error) return toast(result.error.message, "error");
  state.pendingOrderAction = null; closeModal("orderActionConfirm"); closeModal("order"); toast(isArchive ? "Đã chuyển đơn khỏi danh sách vận hành và lưu trữ lịch sử." : "Đã hủy đơn và lưu lịch sử vận hành.", "success"); await loadData();
}

function activateView(view) { $$(".admin-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view)); $$("[data-admin-view]").forEach((section) => section.classList.toggle("active", section.dataset.adminView === view)); els.viewTitle.textContent = ({ overview: "Tổng quan vận hành", products: "Quản lý sản phẩm", orders: "Quản lý đơn hàng", brand: "Thương hiệu & banner", content: "Nội dung & FAQ", shops: "Gian hàng & đối tác", "sale-campaigns": "Săn sale & ưu đãi" })[view] || "Command Deck"; }
function getProduct(id) { return state.products.find((product) => product.id === id); }
function getOrder(id) { return state.orders.find((order) => order.id === id); }
function salesStateBadge(product) { if (product.is_active === false) return '<span class="sale-pill no">PAUSED</span>'; if (Number(product.stock) <= 0) return '<span class="sale-pill no">OUT OF STOCK</span>'; return '<span class="sale-pill yes">SELLING</span>'; }
const TECH_SPEC_FIELDS = [{ key: "processor", label: "CPU / Processor", placeholder: "Apple M3, Intel Core i7..." }, { key: "chipset", label: "Chipset / SoC", placeholder: "Snapdragon 8 Gen 3..." }, { key: "ram", label: "RAM", placeholder: "8GB LPDDR5X" }, { key: "storage", label: "Ổ cứng / Lưu trữ", placeholder: "512GB SSD / 256GB" }, { key: "graphics", label: "GPU / Đồ họa", placeholder: "RTX 4060 / Adreno 750" }, { key: "display", label: "Màn hình", placeholder: "14 inch 2.8K OLED" }, { key: "battery", label: "Pin / Sạc", placeholder: "5000mAh, 80W" }, { key: "connectivity", label: "Kết nối", placeholder: "Wi‑Fi 6E, Bluetooth 5.3" }, { key: "os", label: "Hệ điều hành", placeholder: "Windows 11 / Android 14" }, { key: "ports", label: "Cổng kết nối", placeholder: "USB‑C, HDMI, jack 3.5mm" }, { key: "extras", label: "Thông số khác", placeholder: "Khối lượng, camera, switch..." }];
function mountTechnicalSpecsEditor() { if ($("#technicalSpecsEditor")) return; const editor = document.createElement("details"); editor.className = "technical-specs-editor"; editor.id = "technicalSpecsEditor"; editor.open = true; editor.innerHTML = `<summary>Thông số kỹ thuật</summary><div class="spec-form-grid">${TECH_SPEC_FIELDS.map((field) => `<label>${field.label}<input id="spec${field.key[0].toUpperCase()}${field.key.slice(1)}" data-spec-key="${field.key}" maxlength="160" placeholder="${field.placeholder}" /></label>`).join("")}</div>`; $("#productImageUrl").closest("label").before(editor); }
function setTechnicalSpecs(specs) { TECH_SPEC_FIELDS.forEach((field) => { const input = $(`[data-spec-key="${field.key}"]`); if (input) input.value = specs?.[field.key] || ""; }); }
function collectTechnicalSpecs() { return TECH_SPEC_FIELDS.reduce((result, field) => { const value = $(`[data-spec-key="${field.key}"]`)?.value.trim(); if (value) result[field.key] = value; return result; }, {}); }
function mountContactSettingsFields() { if (!$("#settingSupportPhone")) $("#settingEmail").closest("label").insertAdjacentHTML("afterend", '<label>Hotline liên hệ<input id="settingSupportPhone" inputmode="tel" maxlength="30" placeholder="0901 234 567" /></label>'); if (!$("#settingZaloLabel")) $("#settingZaloPhone").closest("label").insertAdjacentHTML("afterend", '<label>Nhãn liên hệ Zalo<input id="settingZaloLabel" maxlength="100" placeholder="Nhắn Zalo với NEXORA" /></label>'); if (!$("#settingSellerZaloPhone")) $("#settingZaloMessage").closest("label").insertAdjacentHTML("afterend", '<div class="seller-contact-admin"><span class="panel-label">SELLER CONTACT</span><label>Zalo người bán<input id="settingSellerZaloPhone" inputmode="tel" maxlength="30" placeholder="84901234567" /></label><label>Nhãn CTA người bán<input id="settingSellerContactLabel" maxlength="100" placeholder="Liên hệ người bán" /></label><label>Mẫu tin tư vấn<textarea id="settingSellerContactMessage" maxlength="260" placeholder="Xin chào, tôi muốn tư vấn về sản phẩm {product_name}."></textarea></label></div>'); if (!$("#shopZaloPhone")) $("#shopBannerUrl").closest("label").insertAdjacentHTML("afterend", '<div class="seller-contact-admin"><span class="panel-label">SHOP CONTACT</span><label>Zalo gian hàng<input id="shopZaloPhone" inputmode="tel" maxlength="30" placeholder="84901234567" /></label><label>Nhãn CTA Zalo<input id="shopZaloLabel" maxlength="100" value="Liên hệ gian hàng" /></label></div>'); }
function mountFooterSettingsFields() { if ($("#settingFooterCredit")) return; const anchor = $("#settingAddress")?.closest("label"); if (!anchor) return; anchor.insertAdjacentHTML("afterend", '<div class="footer-status-admin"><span class="panel-label">FOOTER STATUS</span><h4>Credit & trạng thái website</h4><p>Chỉ thay đổi nội dung và tín hiệu hiển thị ở chân trang; không dừng chức năng mua sắm.</p><label>Credit chân trang<input id="settingFooterCredit" required maxlength="160" placeholder="© 2026 NEXORA Tech Store" /></label><label>Nhãn trạng thái website<input id="settingFooterStatus" required maxlength="80" placeholder="WEBSITE ĐANG HOẠT ĐỘNG" /></label><label class="form-checks"><input id="settingFooterStatusOnline" type="checkbox" checked /> Website đang hoạt động (hiển thị tín hiệu xanh)</label></div>'); }
function mountEnglishBrandContentFields() { if ($("#settingHeroTitleEn")) return; const after = $("#settingHeroDescription")?.closest("label"); if (!after) return; after.insertAdjacentHTML("afterend", '<div class="english-cms-fields"><span class="panel-label">ENGLISH MODE</span><p>Bản tiếng Anh là tùy chọn. Nếu để trống, storefront dùng bản dịch mặc định của NEXORA.</p><label>Thông báo đầu trang (English)<input id="settingAnnouncementEn" maxlength="180" /></label><label>Tagline footer (English)<textarea id="settingTaglineEn" maxlength="160"></textarea></label><label>Nhãn hero (English)<input id="settingHeroKickerEn" maxlength="100" /></label><label>Tiêu đề chính (English)<input id="settingHeroTitleEn" maxlength="100" /></label><label>Tiêu đề nhấn (English)<input id="settingHeroEmphasisEn" maxlength="100" /></label><label>Mô tả hero (English)<textarea id="settingHeroDescriptionEn" maxlength="400"></textarea></label></div>'); }
function mountEnglishPageContentFields() { if ($("#pageTitleEn")) return; const after = $("#pageContent")?.closest("label"); if (!after) return; after.insertAdjacentHTML("afterend", '<div class="english-cms-fields"><span class="panel-label">ENGLISH MODE</span><p>Bản tiếng Anh là tùy chọn. Nếu để trống, trang thông tin dùng bản dịch mặc định khi có.</p><label>Tiêu đề (English)<input id="pageTitleEn" maxlength="120" /></label><label>Tiêu đề phụ (English)<input id="pageSubtitleEn" maxlength="220" /></label><label>Nội dung (English)<textarea class="tall" id="pageContentEn"></textarea></label></div>'); }
function mountBrandAssetUploads() { if ($("#brandAssetUploadLogo")) return; const fields = [{ id: "brandAssetUploadLogo", target: "#settingLogoUrl", label: "Upload logo" }, { id: "brandAssetUploadFavicon", target: "#settingFaviconUrl", label: "Upload favicon" }, { id: "brandAssetUploadOg", target: "#settingSeoOgImage", label: "Upload ảnh Open Graph" }, { id: "brandAssetUploadHero", target: "#settingHeroImage", label: "Upload hero banner" }]; fields.forEach((field) => { const target = $(field.target); if (!target) return; target.closest("label")?.insertAdjacentHTML("afterend", `<div class="brand-asset-upload"><input id="${field.id}" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" hidden /><button class="quiet-button" type="button" data-brand-upload="${field.id}" data-brand-target="${field.target}"><i class="fa-solid fa-cloud-arrow-up"></i> ${field.label}</button><small>PNG, JPG, WEBP hoặc SVG · tối đa 5 MB</small></div>`); }); document.querySelectorAll("[data-brand-upload]").forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.brandUpload}`)?.click())); document.querySelectorAll(".brand-asset-upload input[type='file']").forEach((input) => input.addEventListener("change", (event) => uploadBrandAsset(event, input.id))); }
async function uploadBrandAsset(event, inputId) { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; const button = $(`[data-brand-upload="${inputId}"]`); const target = $(button?.dataset.brandTarget); if (!target || !db) return; const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]); if (!allowedTypes.has(file.type) || file.size > 5242880) { input.value = ""; return toast("Chỉ nhận PNG, JPG, WEBP hoặc SVG tối đa 5 MB.", "error"); } const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"; const path = `branding/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`; setLoading(button, true, "Đang upload"); const { error } = await db.storage.from("nexora-brand-assets").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false }); setLoading(button, false); input.value = ""; if (error) return toast(`Không upload được ảnh: ${error.message}`, "error"); const { data } = db.storage.from("nexora-brand-assets").getPublicUrl(path); target.value = data.publicUrl; target.dispatchEvent(new Event("input", { bubbles: true })); toast("Đã upload ảnh. Hãy lưu form Thương hiệu để áp dụng storefront.", "success"); }
function mountContentImageUploads() { if ($("#contentAssetUploadProduct")) return; const fields = [{ id: "contentAssetUploadProduct", target: "#productImageUrl", label: "Tải ảnh sản phẩm", context: "sản phẩm" }, { id: "contentAssetUploadShop", target: "#shopBannerUrl", label: "Tải banner gian hàng", context: "gian hàng" }]; fields.forEach((field) => { const target = $(field.target); if (!target) return; target.closest("label")?.insertAdjacentHTML("afterend", `<div class="brand-asset-upload"><input id="${field.id}" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" hidden /><button class="quiet-button" type="button" data-content-upload="${field.id}" data-content-target="${field.target}" data-content-context="${field.context}"><i class="fa-solid fa-cloud-arrow-up"></i> ${field.label}</button><small>PNG, JPG, WEBP hoặc SVG · tối đa 5 MB</small></div>`); }); document.querySelectorAll("[data-content-upload]").forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.contentUpload}`)?.click())); document.querySelectorAll(".brand-asset-upload input[type='file']").forEach((input) => { if (input.dataset.contentBound) return; input.dataset.contentBound = "true"; input.addEventListener("change", uploadContentImage); }); }
async function uploadContentImage(event) { const input = event.currentTarget; const file = input.files?.[0]; const button = $(`[data-content-upload="${input.id}"]`); const target = $(button?.dataset.contentTarget); if (!file || !button || !target || !db) return; const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]); if (!allowedTypes.has(file.type) || file.size > 5242880) { input.value = ""; return toast("Chỉ nhận PNG, JPG, WEBP hoặc SVG tối đa 5 MB.", "error"); } const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"; const path = `branding/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`; setLoading(button, true, "Đang upload"); const { error } = await db.storage.from("nexora-brand-assets").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false }); setLoading(button, false); input.value = ""; if (error) return toast(`Không upload được ảnh: ${error.message}`, "error"); const { data } = db.storage.from("nexora-brand-assets").getPublicUrl(path); target.value = data.publicUrl; target.dispatchEvent(new Event("input", { bubbles: true })); toast(`Đã upload ảnh. Hãy lưu form ${button.dataset.contentContext}.`, "success"); }
function mountSaleAdminUI() { if ($("#saleCampaignView")) return; $(".admin-nav").insertAdjacentHTML("beforeend", '<button data-view="sale-campaigns" type="button"><i class="fa-solid fa-bolt"></i><span>Săn sale</span></button>'); $(".admin-content").insertAdjacentHTML("beforeend", '<section class="admin-view" id="saleCampaignView" data-admin-view="sale-campaigns"><div class="view-toolbar"><div><span class="panel-label">SALE HUNT CONTROL</span><h3>Chiến dịch săn sale</h3><p>Tạo mã giảm giá, thiết lập mức giảm/điều kiện và áp dụng ưu đãi vào đơn hàng.</p></div><button class="action-button primary" id="newSaleCampaignButton" type="button"><i class="fa-solid fa-plus"></i> Tạo chiến dịch</button></div><div class="sale-admin-summary"><div><span>CAMPAIGN ĐANG MỞ</span><strong id="saleActiveCount">0</strong></div><div><span>LƯỢT ĐÃ DÙNG</span><strong id="saleUsageCount">0</strong></div><div><span>ƯU ĐÃI ĐƠN HÀNG</span><strong id="saleDiscountedOrders">0</strong></div></div><div class="admin-panel"><div class="table-wrap"><table><thead><tr><th>Mã sale</th><th>Chiến dịch</th><th>Mức giảm</th><th>Điều kiện</th><th>Thời hạn</th><th>Lượt dùng</th><th>Trạng thái</th><th></th></tr></thead><tbody id="saleCampaignsBody"></tbody></table></div></div></section>'); document.body.insertAdjacentHTML("beforeend", '<section class="admin-modal" id="saleCampaignModal" role="dialog" aria-modal="true" hidden><div class="product-modal-card modal-card-wide"><button class="close-modal" data-close-modal="saleCampaign" type="button"><i class="fa-solid fa-xmark"></i></button><span class="signal-label"><span></span> SALE HUNT EDITOR</span><h2 id="saleCampaignModalTitle">Tạo chiến dịch</h2><form class="product-form" id="saleCampaignForm"><input id="saleCampaignId" type="hidden" /><div class="form-split"><label>Mã sale<input id="saleCampaignCode" required maxlength="32" placeholder="HUNTCYAN10" /></label><label>Nhãn hiển thị<input id="saleCampaignBadge" required maxlength="60" value="SĂN SALE" /></label></div><label>Tên chiến dịch<input id="saleCampaignTitle" required maxlength="140" /></label><label>Mô tả<textarea id="saleCampaignDescription" maxlength="400"></textarea></label><div class="form-split"><label>Loại giảm<select id="saleCampaignType"><option value="percent">Phần trăm (%)</option><option value="fixed">Số tiền (VND)</option></select></label><label>Giá trị giảm<input id="saleCampaignValue" type="number" min="1" required /></label></div><div class="form-split"><label>Đơn tối thiểu<input id="saleCampaignMinimum" type="number" min="0" value="0" required /></label><label>Giảm tối đa<input id="saleCampaignMaximum" type="number" min="0" placeholder="Bỏ trống nếu không giới hạn" /></label></div><div class="form-split"><label>Bắt đầu<input id="saleCampaignStarts" type="datetime-local" required /></label><label>Kết thúc<input id="saleCampaignEnds" type="datetime-local" required /></label></div><div class="form-split"><label>Giới hạn lượt<input id="saleCampaignUsageLimit" type="number" min="1" placeholder="Bỏ trống nếu không giới hạn" /></label><label class="form-checks"><input id="saleCampaignFeatured" type="checkbox" /> Hiện tại khu vực săn sale</label></div><label class="form-checks"><input id="saleCampaignActive" type="checkbox" checked /> Kích hoạt chiến dịch</label><div class="form-actions"><button class="action-button danger hidden" id="deleteSaleCampaignButton" type="button">Xóa</button><button class="action-button primary" id="saveSaleCampaignButton" type="submit">Lưu chiến dịch</button></div></form></div></section>'); $("#newSaleCampaignButton").addEventListener("click", () => openSaleCampaignModal()); $("#saleCampaignForm").addEventListener("submit", saveSaleCampaign); $("#deleteSaleCampaignButton").addEventListener("click", deleteSaleCampaign); $("#saleCampaignsBody").addEventListener("click", (event) => { const button = event.target.closest("[data-edit-campaign]"); if (button) openSaleCampaignModal(state.saleCampaigns.find((item) => item.id === button.dataset.editCampaign)); }); $("#saleCampaignModal").addEventListener("click", (event) => { if (event.target === $("#saleCampaignModal")) closeModal("saleCampaign"); }); $("#orderForm .form-actions").insertAdjacentHTML("beforebegin", '<div class="order-sale-fields"><span class="panel-label">ORDER SALE</span><label>Ưu đãi áp dụng cho đơn<select id="orderSaleCampaign"></select></label><p class="field-hint">Admin có thể chọn/đổi ưu đãi trước khi lưu đơn. Tổng thanh toán sẽ được tính lại theo campaign.</p><div class="discount-preview" id="orderDiscountPreview"></div></div>'); $("#orderSaleCampaign").addEventListener("change", () => updateOrderDiscountPreview(getOrder(state.activeOrderId))); }
function mountSaleUsageHistory() { if ($("#saleUsageHistory")) return; const anchor = $("#saleCampaignView .admin-panel"); if (!anchor) return; anchor.insertAdjacentHTML("afterend", '<section class="admin-panel sale-usage-history" id="saleUsageHistory"><div class="sale-usage-head"><div><span class="panel-label">CAMPAIGN PERFORMANCE</span><h3>Lịch sử dùng mã giảm giá</h3><p>Dữ liệu theo đơn đã áp dụng mã. Không hiển thị thông tin định danh khách hàng.</p></div><label class="sale-usage-filter">Xem theo mã<select id="saleUsageCampaignFilter"><option value="">Tất cả mã</option></select></label></div><div class="sale-usage-metrics"><div><span>LƯỢT ÁP DỤNG</span><strong id="saleUsageOrdersCount">0</strong></div><div><span>TỔNG ƯU ĐÃI</span><strong id="saleUsageDiscountTotal">0₫</strong></div><div><span>DOANH THU ĐÃ XÁC NHẬN</span><strong id="saleUsageConfirmedRevenue">0₫</strong></div></div><div class="table-wrap"><table><thead><tr><th>Mã / đơn</th><th>Thời gian</th><th>Tạm tính</th><th>Ưu đãi</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead><tbody id="saleUsageHistoryBody"></tbody></table></div><p class="sale-usage-note">Bao gồm cả đơn đã lưu trữ; tối đa 250 bản ghi mới nhất. Doanh thu chỉ tính đơn đã thanh toán hoặc đang/đã hoàn tất.</p></section>'); $("#saleUsageCampaignFilter").addEventListener("change", (event) => { state.saleUsageCampaignId = event.currentTarget.value; renderSaleUsageHistory(); }); }
function saleUsageKey(order) { return order.sale_campaign_id || `legacy:${order.sale_code || "unknown"}`; }
function renderSaleUsageHistory() { const body = $("#saleUsageHistoryBody"); const filter = $("#saleUsageCampaignFilter"); if (!body || !filter) return; const campaigns = new Map(state.saleCampaigns.map((campaign) => [campaign.id, campaign])); state.saleUsageOrders.forEach((order) => { const key = saleUsageKey(order); if (!campaigns.has(key)) campaigns.set(key, { id: key, code: order.sale_code || "MÃ ĐÃ XÓA", title: "Chiến dịch đã xóa" }); }); const options = [...campaigns.values()]; if (state.saleUsageCampaignId && !campaigns.has(state.saleUsageCampaignId)) state.saleUsageCampaignId = ""; filter.innerHTML = '<option value="">Tất cả mã</option>' + options.map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.code)} — ${escapeHtml(campaign.title)}</option>`).join(""); filter.value = state.saleUsageCampaignId; const records = state.saleUsageOrders.filter((order) => !state.saleUsageCampaignId || saleUsageKey(order) === state.saleUsageCampaignId); const confirmed = new Set(["paid", "processing", "completed"]); $("#saleUsageOrdersCount").textContent = String(records.length); $("#saleUsageDiscountTotal").textContent = currency(records.reduce((sum, order) => sum + Number(order.discount_amount || 0), 0)); $("#saleUsageConfirmedRevenue").textContent = currency(records.filter((order) => confirmed.has(order.status)).reduce((sum, order) => sum + Number(order.total_amount || 0), 0)); body.innerHTML = records.map((order) => `<tr><td><span class="sale-code-chip">${escapeHtml(order.sale_code || campaigns.get(saleUsageKey(order))?.code || "SALE")}</span><br /><small class="customer-email">${escapeHtml(order.order_number)}</small></td><td>${formatDate(order.created_at)}${order.archived_at ? '<br /><small class="archived-label">Đã lưu trữ</small>' : ""}</td><td>${currency(order.subtotal_amount)}</td><td><strong class="sale-usage-discount">-${currency(order.discount_amount)}</strong></td><td>${currency(order.total_amount)}</td><td><span class="status-pill status-${escapeHtml(order.status)}">${statusLabel(order.status)}</span></td></tr>`).join("") || emptyRow("Chưa có đơn hàng nào sử dụng mã giảm giá này.", 6); }
function renderSaleCampaigns() { const body = $("#saleCampaignsBody"); if (!body) return; const now = Date.now(); const active = state.saleCampaigns.filter((campaign) => campaign.is_active && new Date(campaign.starts_at).getTime() <= now && new Date(campaign.ends_at).getTime() >= now); $("#saleActiveCount").textContent = active.length; $("#saleUsageCount").textContent = state.saleCampaigns.reduce((sum, campaign) => sum + Number(campaign.usage_count || 0), 0); $("#saleDiscountedOrders").textContent = state.orders.filter((order) => Number(order.discount_amount || 0) > 0).length; body.innerHTML = state.saleCampaigns.map((campaign) => `<tr><td><span class="sale-code-chip">${escapeHtml(campaign.code)}</span></td><td><b>${escapeHtml(campaign.title)}</b><br /><small>${escapeHtml(campaign.badge_text)}</small></td><td><span class="sale-value">${campaign.discount_type === "percent" ? `${campaign.discount_value}%` : currency(campaign.discount_value)}</span></td><td>Đơn từ ${currency(campaign.minimum_order_amount)}${campaign.maximum_discount_amount ? `<br /><small>Tối đa ${currency(campaign.maximum_discount_amount)}</small>` : ""}</td><td>${formatDate(campaign.starts_at)}<br /><small>đến ${formatDate(campaign.ends_at)}</small></td><td>${campaign.usage_count || 0}${campaign.usage_limit ? ` / ${campaign.usage_limit}` : ""}</td><td><span class="${campaign.is_active ? "sale-status-live" : "sale-status-paused"}">${campaign.is_active ? "ACTIVE" : "PAUSED"}</span></td><td><button class="row-action" data-edit-campaign="${escapeHtml(campaign.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Chưa có chiến dịch săn sale.", 8); }
function openSaleCampaignModal(campaign = null) { state.editingSaleCampaignId = campaign?.id || null; $("#saleCampaignForm").reset(); $("#deleteSaleCampaignButton").classList.toggle("hidden", !campaign); $("#saleCampaignModalTitle").textContent = campaign ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch"; const now = new Date(); const later = new Date(Date.now() + 7 * 86400000); $("#saleCampaignStarts").value = toDateTimeInput(campaign?.starts_at || now); $("#saleCampaignEnds").value = toDateTimeInput(campaign?.ends_at || later); $("#saleCampaignActive").checked = campaign?.is_active !== false; if (campaign) { $("#saleCampaignId").value = campaign.id; $("#saleCampaignCode").value = campaign.code; $("#saleCampaignBadge").value = campaign.badge_text; $("#saleCampaignTitle").value = campaign.title; $("#saleCampaignDescription").value = campaign.description; $("#saleCampaignType").value = campaign.discount_type; $("#saleCampaignValue").value = campaign.discount_value; $("#saleCampaignMinimum").value = campaign.minimum_order_amount; $("#saleCampaignMaximum").value = campaign.maximum_discount_amount || ""; $("#saleCampaignUsageLimit").value = campaign.usage_limit || ""; $("#saleCampaignFeatured").checked = campaign.is_hunt_featured; } openModal("saleCampaign"); }
async function saveSaleCampaign(event) { event.preventDefault(); const payload = { code: $("#saleCampaignCode").value.trim().toUpperCase(), badge_text: $("#saleCampaignBadge").value.trim(), title: $("#saleCampaignTitle").value.trim(), description: $("#saleCampaignDescription").value.trim(), discount_type: $("#saleCampaignType").value, discount_value: Number($("#saleCampaignValue").value), minimum_order_amount: Number($("#saleCampaignMinimum").value), maximum_discount_amount: Number($("#saleCampaignMaximum").value) || null, starts_at: new Date($("#saleCampaignStarts").value).toISOString(), ends_at: new Date($("#saleCampaignEnds").value).toISOString(), usage_limit: Number($("#saleCampaignUsageLimit").value) || null, is_hunt_featured: $("#saleCampaignFeatured").checked, is_active: $("#saleCampaignActive").checked, updated_at: new Date().toISOString() }; if (new Date(payload.ends_at) <= new Date(payload.starts_at)) return toast("Thời điểm kết thúc phải sau thời điểm bắt đầu.", "error"); const result = state.editingSaleCampaignId ? await db.from("sale_campaigns").update(payload).eq("id", state.editingSaleCampaignId) : await db.from("sale_campaigns").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("saleCampaign"); toast("Đã lưu chiến dịch săn sale.", "success"); await loadData(); }
async function deleteSaleCampaign() { if (!state.editingSaleCampaignId || !confirm("Xóa chiến dịch sale này?")) return; const { error } = await db.from("sale_campaigns").delete().eq("id", state.editingSaleCampaignId); if (error) return toast(error.message, "error"); closeModal("saleCampaign"); toast("Đã xóa chiến dịch sale.", "success"); await loadData(); }
function calculateOrderDiscount(campaign, subtotal) { if (!campaign || !campaign.is_active || subtotal < Number(campaign.minimum_order_amount || 0)) return 0; let value = campaign.discount_type === "percent" ? Math.floor(subtotal * Number(campaign.discount_value) / 100) : Number(campaign.discount_value); if (campaign.maximum_discount_amount) value = Math.min(value, Number(campaign.maximum_discount_amount)); return Math.min(value, subtotal); }
function populateOrderSaleCampaigns(order) { const select = $("#orderSaleCampaign"); if (!select) return; select.innerHTML = '<option value="">Không áp dụng ưu đãi</option>' + state.saleCampaigns.filter((campaign) => campaign.is_active).map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.code)} — ${escapeHtml(campaign.title)}</option>`).join(""); select.value = order.sale_campaign_id || ""; }
function updateOrderDiscountPreview(order) { const preview = $("#orderDiscountPreview"); const campaign = state.saleCampaigns.find((item) => item.id === $("#orderSaleCampaign")?.value); const subtotal = Number(order?.subtotal_amount ?? (Number(order?.total_amount || 0) + Number(order?.discount_amount || 0))); const discount = calculateOrderDiscount(campaign, subtotal); preview.innerHTML = campaign ? `Tạm tính <strong>${currency(subtotal)}</strong> · giảm <strong>${currency(discount)}</strong> · tổng mới <strong>${currency(subtotal - discount)}</strong>` : `Tạm tính <strong>${currency(subtotal)}</strong> · chưa áp dụng ưu đãi.`; }
function toDateTimeInput(value) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function suggestSku() { if (state.editingProductId || $("#productSku").value.trim()) return; const base = normalize($("#productName").value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 28).toUpperCase(); if (base) $("#productSku").value = `NXR-${base}`; }
function updateProductPreview() { const url = $("#productImageUrl").value.trim(); const image = $("#productImagePreview"); const frame = $("#productPreviewFrame"); if (!url) return hideProductPreview(); image.hidden = false; frame.classList.add("has-image"); image.src = url; }
function hideProductPreview(message = "IMAGE PREVIEW") { const image = $("#productImagePreview"); image.hidden = true; image.removeAttribute("src"); $("#productPreviewFrame").classList.remove("has-image"); $("#productPreviewFrame .preview-empty").innerHTML = `<i class="fa-solid fa-image"></i><br />${escapeHtml(message)}`; }
function setTableLoading() { const row = '<tr class="loading-row"><td colspan="9"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang đồng bộ dữ liệu...</td></tr>'; els.productsBody.innerHTML = row; els.ordersBody.innerHTML = row; els.recentOrders.innerHTML = row; }
function emptyRow(message, colspan) { return `<tr class="empty-row"><td colspan="${colspan}">${message}</td></tr>`; }
function currency(value) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function formatDate(value) { return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function statusLabel(status) { return ({ pending_payment: "Chờ thanh toán", paid: "Đã thanh toán", processing: "Đang xử lý", completed: "Hoàn thành", cancelled: "Đã hủy" })[status] || status; }
function fulfillmentLabel(status) { return ({ unfulfilled: "Chưa giao", preparing: "Đang chuẩn bị", ready_to_ship: "Sắp giao", shipped: "Đang giao", delivered: "Đã giao", returned: "Hoàn hàng" })[status || "unfulfilled"] || status; }
function shortId(value) { return value ? `${String(value).slice(0, 7)}…` : "—"; }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function slugify(value) { return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char])); }
function setLoading(button, loading, label = "Đang xử lý") { if (loading) { button.dataset.label = button.innerHTML; button.disabled = true; button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${label}`; } else { button.disabled = false; button.innerHTML = button.dataset.label || button.innerHTML; } }
function toast(message, type = "info") { const icon = type === "error" ? "fa-circle-exclamation" : type === "success" ? "fa-circle-check" : "fa-circle-info"; const element = document.createElement("div"); element.className = `toast ${type}`; element.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`; els.toastRegion.append(element); window.setTimeout(() => element.remove(), 3800); }
