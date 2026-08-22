/* Circuit Atelier Command Deck — RLS-bound marketplace operations and CMS. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const state = {
  user: null, products: [], orders: [], settings: null, pages: [], faqs: [], shops: [],
  fulfillmentFilter: "all", paymentFilter: "all", activeOrderId: null, editingProductId: null, editingFaqId: null, editingShopId: null,
};

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
  const { data } = await db.auth.getSession();
  if (data.session?.user) await verifyAdmin(data.session.user);
  db.auth.onAuthStateChange((_event, session) => { if (!session?.user) showGate("Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."); });
}

function bindEvents() {
  els.loginForm.addEventListener("submit", login);
  els.signOut.addEventListener("click", signOut);
  mountTechnicalSpecsEditor(); mountContactSettingsFields();
  $$(".admin-nav button").forEach((button) => button.addEventListener("click", () => activateView(button.dataset.view)));
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
  $("#productImageUrl").addEventListener("input", updateProductPreview);
  $("#productImagePreview").addEventListener("error", () => hideProductPreview("Không tải được ảnh"));
  els.fulfillmentFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fulfillment-filter]"); if (!button) return;
    state.fulfillmentFilter = button.dataset.fulfillmentFilter;
    $$("button", els.fulfillmentFilters).forEach((item) => item.classList.toggle("active", item === button));
    renderOrders();
  });
  els.paymentFilter.addEventListener("change", () => { state.paymentFilter = els.paymentFilter.value; renderOrders(); });
  els.ordersBody.addEventListener("click", (event) => { const paymentButton = event.target.closest("[data-payment-action]"); if (paymentButton) { updatePaymentStatus(paymentButton.dataset.orderId, paymentButton.dataset.paymentAction); return; } const button = event.target.closest("[data-edit-order]"); if (button) openOrderModal(getOrder(button.dataset.editOrder)); });
  els.refreshOrders.addEventListener("click", loadData);
  $("#orderForm").addEventListener("submit", saveOrder);
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

async function login(event) {
  event.preventDefault();
  const email = els.loginEmail.value.trim(); const password = els.loginPassword.value;
  if (!email || !password) return toast("Nhập email và mật khẩu để tiếp tục.", "error");
  setLoading(els.loginButton, true, "Đang xác thực");
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  setLoading(els.loginButton, false);
  if (error) return toast(error.message, "error");
  await verifyAdmin(data.user);
}

async function verifyAdmin(user) {
  const { data: allowed, error } = await db.rpc("is_admin");
  if (error || !allowed) { await db.auth.signOut(); return showGate("Tài khoản này chưa có quyền quản trị. Hãy thêm email vào bảng admin_users theo supabase-admin.sql."); }
  state.user = user;
  els.operatorName.textContent = user.email || "Admin";
  els.operatorInitial.textContent = (user.email || "A")[0].toUpperCase();
  els.gate.hidden = true; els.app.hidden = false;
  await loadData();
}

async function signOut() { if (db) await db.auth.signOut(); showGate("Bạn đã đăng xuất khỏi Command Deck."); }
function showGate(message) { state.user = null; els.app.hidden = true; els.gate.hidden = false; els.gateMessage.textContent = message; els.loginPassword.value = ""; }

async function loadData() {
  setTableLoading();
  const [productsResult, ordersResult, settingsResult, pagesResult, faqsResult, shopsResult] = await Promise.all([
    db.from("products").select("*").order("created_at", { ascending: false }),
    db.from("orders").select("id,order_number,user_id,total_amount,status,payment_method,payment_note,payment_confirmed_at,payment_confirmation_note,zalo_confirmation_requested_at,customer_name,customer_phone,shipping_address,shipping_note,fulfillment_status,carrier,tracking_code,admin_note,fulfillment_updated_at,delivered_at,created_at,updated_at,order_items(product_name,unit_price,quantity,subtotal)").order("created_at", { ascending: false }),
    db.from("site_settings").select("*").eq("singleton", true).maybeSingle(),
    db.from("site_pages").select("*").order("slug"),
    db.from("faqs").select("*").order("sort_order"),
    db.from("shops").select("*").order("created_at", { ascending: false }),
  ]);
  if (productsResult.error || ordersResult.error) return toast(productsResult.error?.message || ordersResult.error?.message || "Không tải được dữ liệu quản trị.", "error");
  state.products = productsResult.data || []; state.orders = ordersResult.data || [];
  if (settingsResult.error || pagesResult.error || faqsResult.error || shopsResult.error) toast("CMS chưa sẵn sàng. Hãy chạy supabase-marketplace-cms.sql.", "error");
  state.settings = settingsResult.data || null; state.pages = pagesResult.data || []; state.faqs = faqsResult.data || []; state.shops = shopsResult.data || [];
  renderMetrics(); renderOperationsMetrics(); renderRevenueChart(); renderProducts(); renderOrders(); renderRecentOrders(); renderSettings(); renderFaqs(); renderShops(); fillPageForm();
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
function compactOrderRow(order) { return `<tr><td><b>${escapeHtml(order.order_number)}</b></td><td>${formatDate(order.created_at)}</td><td>${order.payment_method === "momo" ? "MoMo" : "VietQR"}</td><td><b>${currency(order.total_amount)}</b></td><td><span class="fulfillment-pill fulfillment-${escapeHtml(order.fulfillment_status || "unfulfilled")}">${fulfillmentLabel(order.fulfillment_status)}</span></td></tr>`; }
function renderOrders() {
  const rows = state.orders.filter((order) => (state.fulfillmentFilter === "all" || (order.fulfillment_status || "unfulfilled") === state.fulfillmentFilter) && (state.paymentFilter === "all" || order.status === state.paymentFilter));
  els.ordersBody.innerHTML = rows.map(orderRow).join("") || emptyRow("Không có đơn hàng thuộc bộ lọc này.", 8);
}
function orderRow(order) {
  const customerName = order.customer_name || shortId(order.user_id); const itemCount = order.order_items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
  return `<tr><td><b>${escapeHtml(order.order_number)}</b><br /><small class="customer-email">${escapeHtml(order.tracking_code || "Chưa có mã vận đơn")}</small></td><td><span class="order-customer"><b>${escapeHtml(customerName)}</b><small>${escapeHtml(order.customer_phone || "Chưa có số liên hệ")}</small></span></td><td>${formatDate(order.created_at)}</td><td><span class="status-pill status-${escapeHtml(order.status)}">${statusLabel(order.status)}</span></td><td><div class="payment-actions"><button class="payment-action pending ${order.status === "pending_payment" ? "active" : ""}" data-payment-action="pending_payment" data-order-id="${escapeHtml(order.id)}" type="button">Chưa TT</button><button class="payment-action paid ${order.status === "paid" ? "active" : ""}" data-payment-action="paid" data-order-id="${escapeHtml(order.id)}" type="button">Đã TT</button></div></td><td><span class="fulfillment-pill fulfillment-${escapeHtml(order.fulfillment_status || "unfulfilled")}">${fulfillmentLabel(order.fulfillment_status)}</span></td><td><b>${currency(order.total_amount)}</b></td><td>${itemCount} SP</td><td><button class="row-action" data-edit-order="${escapeHtml(order.id)}" aria-label="Chỉnh sửa đơn ${escapeHtml(order.order_number)}"><i class="fa-solid fa-pen"></i></button></td></tr>`;
}

function renderProducts() {
  const query = normalize(els.productSearch.value);
  const products = state.products.filter((product) => normalize(`${product.name} ${product.category} ${product.sku || ""} ${product.brand || ""}`).includes(query));
  els.productCount.textContent = `${products.length} sản phẩm`;
  els.productsBody.innerHTML = products.map((product) => `<tr><td><div class="product-cell"><img src="${escapeHtml(product.image_url)}" alt="" /><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.sku || product.slug)} · ${escapeHtml(product.brand || "NEXORA")}</small></span></div></td><td>${escapeHtml(product.category)}</td><td><b>${currency(product.price)}</b><br /><small>${product.warranty_months ?? 12} tháng BH</small></td><td>${product.stock}</td><td><span class="sale-pill ${product.is_sale ? "yes" : "no"}">${product.is_sale ? "SALE" : "STANDARD"}</span></td><td>${salesStateBadge(product)}</td><td><div class="sales-actions"><button class="sales-action ${product.is_active !== false && Number(product.stock) > 0 ? "is-active" : ""}" data-sales-action="selling" data-product-id="${escapeHtml(product.id)}" type="button" title="Mở bán" ${product.is_active !== false && Number(product.stock) > 0 ? "disabled" : ""}><i class="fa-solid fa-play"></i></button><button class="sales-action ${product.is_active === false ? "is-paused" : ""}" data-sales-action="paused" data-product-id="${escapeHtml(product.id)}" type="button" title="Ngừng bán" ${product.is_active === false ? "disabled" : ""}><i class="fa-solid fa-pause"></i></button><button class="sales-action ${product.is_active !== false && Number(product.stock) === 0 ? "is-out" : ""}" data-sales-action="out" data-product-id="${escapeHtml(product.id)}" type="button" title="Đánh dấu hết hàng" ${product.is_active !== false && Number(product.stock) === 0 ? "disabled" : ""}><i class="fa-solid fa-box-open"></i></button></div></td><td><button class="row-action" data-edit-product="${escapeHtml(product.id)}" aria-label="Chỉnh sửa ${escapeHtml(product.name)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Không tìm thấy sản phẩm.", 8);
}

function renderSettings() {
  if (!state.settings) return;
  const map = { "#settingSiteName": "site_name", "#settingTagline": "site_tagline", "#settingLogoUrl": "logo_url", "#settingAnnouncement": "announcement_text", "#settingEmail": "support_email", "#settingSupportPhone": "support_phone", "#settingHours": "support_hours", "#settingAddress": "address_text", "#settingZaloPhone": "zalo_phone", "#settingZaloLabel": "zalo_label", "#settingZaloMessage": "zalo_confirmation_message", "#settingHeroKicker": "hero_kicker", "#settingHeroTitle": "hero_title", "#settingHeroEmphasis": "hero_emphasis", "#settingHeroDescription": "hero_description", "#settingHeroImage": "hero_image_url" };
  Object.entries(map).forEach(([selector, key]) => { $(selector).value = state.settings[key] || ""; });
}
function fillPageForm() { const page = state.pages.find((item) => item.slug === els.pageSelect.value); $("#pageTitle").value = page?.title || ""; $("#pageSubtitle").value = page?.subtitle || ""; $("#pageContent").value = page?.content || ""; }
function renderFaqs() { els.faqCount.textContent = state.faqs.length; els.faqBody.innerHTML = state.faqs.map((faq) => `<tr><td><span class="list-name">${escapeHtml(faq.question)}</span><span class="list-description">${escapeHtml(faq.answer)}</span></td><td><input class="status-toggle" type="checkbox" disabled ${faq.is_published ? "checked" : ""} /></td><td><button class="row-action" data-edit-faq="${escapeHtml(faq.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Chưa có FAQ.", 3); }
function renderShops() { els.shopsBody.innerHTML = state.shops.map((shop) => `<tr><td><div class="product-cell">${shop.banner_url ? `<img class="image-mini" src="${escapeHtml(shop.banner_url)}" alt="" />` : ""}<span><b>${escapeHtml(shop.name)}</b><small>${escapeHtml(shop.slug)}</small></span></div></td><td>${escapeHtml(shop.category)}</td><td class="customer-email">${escapeHtml(shop.contact_email || "—")}</td><td><span class="shop-flag ${shop.is_verified ? "" : "muted"}"><i class="fa-solid fa-circle-check"></i>${shop.is_verified ? "Verified" : "Chưa xác minh"}</span></td><td><span class="sale-pill ${shop.is_active ? "yes" : "no"}">${shop.is_active ? "ACTIVE" : "HIDDEN"}</span></td><td><button class="row-action" data-edit-shop="${escapeHtml(shop.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Chưa có gian hàng.", 6); }

function openProductModal(product = null) {
  state.editingProductId = product?.id || null;
  $("#productForm").reset();
  $("#productModalTitle").textContent = product ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm mới";
  $("#deleteProductButton").classList.toggle("hidden", !product);
  $("#productBrand").value = product?.brand || "NEXORA";
  $("#productWarranty").value = product?.warranty_months ?? 12;
  $("#productActive").checked = product?.is_active !== false;
  if (product) {
    $("#productId").value = product.id; $("#productName").value = product.name; $("#productSku").value = product.sku || "";
    $("#productCategory").value = product.category; $("#productStock").value = product.stock; $("#productDescription").value = product.description;
    $("#productImageUrl").value = product.image_url; $("#productPrice").value = product.price; $("#productOriginalPrice").value = product.original_price;
    $("#productSale").checked = product.is_sale; $("#productFeatured").checked = product.featured;
  }
  setTechnicalSpecs(product?.technical_specs || {});
  updateProductPreview(); openModal("product");
}
function openFaqModal(faq = null) { state.editingFaqId = faq?.id || null; $("#faqForm").reset(); $("#deleteFaqButton").classList.toggle("hidden", !faq); $("#faqModalTitle").textContent = faq ? "Chỉnh sửa FAQ" : "Thêm FAQ"; if (faq) { $("#faqId").value = faq.id; $("#faqQuestion").value = faq.question; $("#faqAnswer").value = faq.answer; $("#faqSortOrder").value = faq.sort_order; $("#faqPublished").checked = faq.is_published; } openModal("faq"); }
function openShopModal(shop = null) { state.editingShopId = shop?.id || null; $("#shopForm").reset(); $("#deleteShopButton").classList.toggle("hidden", !shop); $("#shopModalTitle").textContent = shop ? "Chỉnh sửa gian hàng" : "Thêm gian hàng"; if (shop) { $("#shopId").value = shop.id; $("#shopName").value = shop.name; $("#shopCategory").value = shop.category; $("#shopEmail").value = shop.contact_email || ""; $("#shopDescription").value = shop.description; $("#shopBannerUrl").value = shop.banner_url || ""; $("#shopVerified").checked = shop.is_verified; $("#shopActive").checked = shop.is_active; } openModal("shop"); }
function openOrderModal(order) {
  if (!order) return; state.activeOrderId = order.id; $("#orderModalTitle").textContent = `Đơn ${order.order_number}`;
  $("#orderId").value = order.id; $("#orderNumber").value = order.order_number; $("#orderPaymentStatus").value = order.status;
  $("#orderCustomerName").value = order.customer_name || ""; $("#orderCustomerPhone").value = order.customer_phone || ""; $("#orderShippingAddress").value = order.shipping_address || ""; $("#orderShippingNote").value = order.shipping_note || "";
  $("#orderPaymentConfirmationNote").value = order.payment_confirmation_note || ""; $("#orderFulfillmentStatus").value = order.fulfillment_status || "unfulfilled"; $("#orderCarrier").value = order.carrier || ""; $("#orderTrackingCode").value = order.tracking_code || ""; $("#orderAdminNote").value = order.admin_note || "";
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
    price, original_price: originalPrice, technical_specs: collectTechnicalSpecs(), is_active: $("#productActive").checked, is_sale: $("#productSale").checked, featured: $("#productFeatured").checked, updated_at: new Date().toISOString(),
  };
  setLoading($("#saveProductButton"), true, "Đang lưu");
  const result = state.editingProductId ? await db.from("products").update(payload).eq("id", state.editingProductId) : await db.from("products").insert(payload);
  setLoading($("#saveProductButton"), false);
  if (result.error) return toast(result.error.message, "error");
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
  const payload = { status, payment_confirmed_at: status === "paid" ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
  const { error } = await db.from("orders").update(payload).eq("id", orderId);
  if (error) return toast(error.message, "error");
  Object.assign(order, payload); renderMetrics(); renderOperationsMetrics(); renderRevenueChart(); renderOrders(); renderRecentOrders(); toast(status === "paid" ? "Đã xác nhận thanh toán." : "Đã chuyển đơn về trạng thái chưa thanh toán.", "success");
}

async function saveSettings(event) { event.preventDefault(); const fields = { site_name: "#settingSiteName", site_tagline: "#settingTagline", logo_url: "#settingLogoUrl", announcement_text: "#settingAnnouncement", support_email: "#settingEmail", support_phone: "#settingSupportPhone", support_hours: "#settingHours", address_text: "#settingAddress", zalo_phone: "#settingZaloPhone", zalo_label: "#settingZaloLabel", zalo_confirmation_message: "#settingZaloMessage", hero_kicker: "#settingHeroKicker", hero_title: "#settingHeroTitle", hero_emphasis: "#settingHeroEmphasis", hero_description: "#settingHeroDescription", hero_image_url: "#settingHeroImage" }; const payload = { singleton: true, updated_at: new Date().toISOString() }; Object.entries(fields).forEach(([key, selector]) => { payload[key] = $(selector).value.trim(); }); const { error } = await db.from("site_settings").upsert(payload, { onConflict: "singleton" }); if (error) return toast(error.message, "error"); state.settings = payload; toast("Đã lưu nhận diện storefront.", "success"); }
async function savePage(event) { event.preventDefault(); const payload = { slug: els.pageSelect.value, title: $("#pageTitle").value.trim(), subtitle: $("#pageSubtitle").value.trim(), content: $("#pageContent").value.trim(), updated_at: new Date().toISOString() }; const { error } = await db.from("site_pages").upsert(payload, { onConflict: "slug" }); if (error) return toast(error.message, "error"); const index = state.pages.findIndex((item) => item.slug === payload.slug); if (index >= 0) state.pages[index] = payload; else state.pages.push(payload); toast("Đã lưu trang thông tin.", "success"); }
async function saveFaq(event) { event.preventDefault(); const payload = { question: $("#faqQuestion").value.trim(), answer: $("#faqAnswer").value.trim(), sort_order: Number($("#faqSortOrder").value), is_published: $("#faqPublished").checked, updated_at: new Date().toISOString() }; const result = state.editingFaqId ? await db.from("faqs").update(payload).eq("id", state.editingFaqId) : await db.from("faqs").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("faq"); toast("Đã lưu FAQ.", "success"); loadData(); }
async function deleteFaq() { if (!state.editingFaqId || !window.confirm("Xóa FAQ này?")) return; const { error } = await db.from("faqs").delete().eq("id", state.editingFaqId); if (error) return toast(error.message, "error"); closeModal("faq"); toast("Đã xóa FAQ.", "success"); loadData(); }
async function saveShop(event) { event.preventDefault(); const name = $("#shopName").value.trim(); const payload = { name, slug: slugify(name), category: $("#shopCategory").value.trim(), contact_email: $("#shopEmail").value.trim() || null, description: $("#shopDescription").value.trim(), banner_url: $("#shopBannerUrl").value.trim() || null, is_verified: $("#shopVerified").checked, is_active: $("#shopActive").checked, updated_at: new Date().toISOString() }; const result = state.editingShopId ? await db.from("shops").update(payload).eq("id", state.editingShopId) : await db.from("shops").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("shop"); toast("Đã lưu gian hàng.", "success"); loadData(); }
async function deleteShop() { if (!state.editingShopId || !window.confirm("Xóa gian hàng này?")) return; const { error } = await db.from("shops").delete().eq("id", state.editingShopId); if (error) return toast(error.message, "error"); closeModal("shop"); toast("Đã xóa gian hàng.", "success"); loadData(); }
async function saveOrder(event) {
  event.preventDefault(); const order = getOrder(state.activeOrderId); if (!order) return;
  const fulfillment = $("#orderFulfillmentStatus").value;
  const paymentStatus = $("#orderPaymentStatus").value;
  const payload = { status: paymentStatus, payment_confirmation_note: $("#orderPaymentConfirmationNote").value.trim() || null, customer_name: $("#orderCustomerName").value.trim() || null, customer_phone: $("#orderCustomerPhone").value.trim() || null, shipping_address: $("#orderShippingAddress").value.trim() || null, shipping_note: $("#orderShippingNote").value.trim() || null, fulfillment_status: fulfillment, carrier: $("#orderCarrier").value.trim() || null, tracking_code: $("#orderTrackingCode").value.trim() || null, admin_note: $("#orderAdminNote").value.trim() || null, updated_at: new Date().toISOString() };
  if (paymentStatus === "paid" && !order.payment_confirmed_at) payload.payment_confirmed_at = new Date().toISOString();
  if (paymentStatus === "pending_payment") payload.payment_confirmed_at = null;
  if (fulfillment !== (order.fulfillment_status || "unfulfilled")) payload.fulfillment_updated_at = new Date().toISOString();
  if (fulfillment === "delivered" && !order.delivered_at) payload.delivered_at = new Date().toISOString();
  if (fulfillment !== "delivered") payload.delivered_at = null;
  setLoading($("#saveOrderButton"), true, "Đang lưu"); const { error } = await db.from("orders").update(payload).eq("id", order.id); setLoading($("#saveOrderButton"), false);
  if (error) return toast(error.message, "error"); closeModal("order"); toast("Đã cập nhật đơn hàng.", "success"); await loadData();
}

function activateView(view) { $$(".admin-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view)); $$("[data-admin-view]").forEach((section) => section.classList.toggle("active", section.dataset.adminView === view)); els.viewTitle.textContent = ({ overview: "Tổng quan vận hành", products: "Quản lý sản phẩm", orders: "Quản lý đơn hàng", brand: "Thương hiệu & banner", content: "Nội dung & FAQ", shops: "Gian hàng & đối tác" })[view] || "Command Deck"; }
function getProduct(id) { return state.products.find((product) => product.id === id); }
function getOrder(id) { return state.orders.find((order) => order.id === id); }
function salesStateBadge(product) { if (product.is_active === false) return '<span class="sale-pill no">PAUSED</span>'; if (Number(product.stock) <= 0) return '<span class="sale-pill no">OUT OF STOCK</span>'; return '<span class="sale-pill yes">SELLING</span>'; }
const TECH_SPEC_FIELDS = [{ key: "processor", label: "CPU / Processor", placeholder: "Apple M3, Intel Core i7..." }, { key: "chipset", label: "Chipset / SoC", placeholder: "Snapdragon 8 Gen 3..." }, { key: "ram", label: "RAM", placeholder: "8GB LPDDR5X" }, { key: "storage", label: "Ổ cứng / Lưu trữ", placeholder: "512GB SSD / 256GB" }, { key: "graphics", label: "GPU / Đồ họa", placeholder: "RTX 4060 / Adreno 750" }, { key: "display", label: "Màn hình", placeholder: "14 inch 2.8K OLED" }, { key: "battery", label: "Pin / Sạc", placeholder: "5000mAh, 80W" }, { key: "connectivity", label: "Kết nối", placeholder: "Wi‑Fi 6E, Bluetooth 5.3" }, { key: "os", label: "Hệ điều hành", placeholder: "Windows 11 / Android 14" }, { key: "ports", label: "Cổng kết nối", placeholder: "USB‑C, HDMI, jack 3.5mm" }, { key: "extras", label: "Thông số khác", placeholder: "Khối lượng, camera, switch..." }];
function mountTechnicalSpecsEditor() { if ($("#technicalSpecsEditor")) return; const editor = document.createElement("details"); editor.className = "technical-specs-editor"; editor.id = "technicalSpecsEditor"; editor.open = true; editor.innerHTML = `<summary>Thông số kỹ thuật</summary><div class="spec-form-grid">${TECH_SPEC_FIELDS.map((field) => `<label>${field.label}<input id="spec${field.key[0].toUpperCase()}${field.key.slice(1)}" data-spec-key="${field.key}" maxlength="160" placeholder="${field.placeholder}" /></label>`).join("")}</div>`; $("#productImageUrl").closest("label").before(editor); }
function setTechnicalSpecs(specs) { TECH_SPEC_FIELDS.forEach((field) => { const input = $(`[data-spec-key="${field.key}"]`); if (input) input.value = specs?.[field.key] || ""; }); }
function collectTechnicalSpecs() { return TECH_SPEC_FIELDS.reduce((result, field) => { const value = $(`[data-spec-key="${field.key}"]`)?.value.trim(); if (value) result[field.key] = value; return result; }, {}); }
function mountContactSettingsFields() { if (!$("#settingSupportPhone")) $("#settingEmail").closest("label").insertAdjacentHTML("afterend", '<label>Hotline liên hệ<input id="settingSupportPhone" inputmode="tel" maxlength="30" placeholder="0901 234 567" /></label>'); if (!$("#settingZaloLabel")) $("#settingZaloPhone").closest("label").insertAdjacentHTML("afterend", '<label>Nhãn liên hệ Zalo<input id="settingZaloLabel" maxlength="100" placeholder="Nhắn Zalo với NEXORA" /></label>'); }
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
