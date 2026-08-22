/* Circuit Atelier Command Deck — RLS-bound marketplace operations and CMS. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const state = {
  user: null, products: [], orders: [], settings: null, pages: [], faqs: [], shops: [],
  orderFilter: "all", editingProductId: null, editingFaqId: null, editingShopId: null,
};

const els = {
  gate: $("#adminGate"), gateMessage: $("#gateMessage"), loginForm: $("#adminLoginForm"), loginEmail: $("#adminEmail"), loginPassword: $("#adminPassword"), loginButton: $("#adminLoginButton"), app: $("#adminApp"),
  operatorName: $("#operatorName"), operatorInitial: $("#operatorInitial"), signOut: $("#adminSignOut"), viewTitle: $("#viewTitle"),
  metricRevenue: $("#metricRevenue"), metricOrders: $("#metricOrders"), metricProducts: $("#metricProducts"), metricPending: $("#metricPending"), metricSale: $("#metricSale"), recentOrders: $("#recentOrdersBody"),
  productCount: $("#adminProductCount"), productSearch: $("#adminProductSearch"), productsBody: $("#productsTableBody"), newProduct: $("#newProductButton"),
  refreshOrders: $("#refreshOrdersButton"), ordersBody: $("#ordersTableBody"), orderFilters: $("#orderFilters"),
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
  $$(".admin-nav button").forEach((button) => button.addEventListener("click", () => activateView(button.dataset.view)));
  $$('[data-view-jump]').forEach((button) => button.addEventListener("click", () => activateView(button.dataset.viewJump)));
  els.newProduct.addEventListener("click", () => openProductModal());
  els.productSearch.addEventListener("input", renderProducts);
  els.productsBody.addEventListener("click", (event) => { const button = event.target.closest("[data-edit-product]"); if (button) openProductModal(getProduct(button.dataset.editProduct)); });
  $("#productForm").addEventListener("submit", saveProduct);
  $("#deleteProductButton").addEventListener("click", deleteProduct);
  els.orderFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-filter]"); if (!button) return;
    state.orderFilter = button.dataset.orderFilter;
    $$("button", els.orderFilters).forEach((item) => item.classList.toggle("active", item === button));
    renderOrders();
  });
  els.ordersBody.addEventListener("change", updateOrderStatus);
  els.refreshOrders.addEventListener("click", loadData);
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
    db.from("orders").select("id,order_number,user_id,total_amount,status,payment_method,created_at").order("created_at", { ascending: false }),
    db.from("site_settings").select("*").eq("singleton", true).maybeSingle(),
    db.from("site_pages").select("*").order("slug"),
    db.from("faqs").select("*").order("sort_order"),
    db.from("shops").select("*").order("created_at", { ascending: false }),
  ]);
  if (productsResult.error || ordersResult.error) return toast(productsResult.error?.message || ordersResult.error?.message || "Không tải được dữ liệu quản trị.", "error");
  state.products = productsResult.data || []; state.orders = ordersResult.data || [];
  if (settingsResult.error || pagesResult.error || faqsResult.error || shopsResult.error) toast("CMS chưa sẵn sàng. Hãy chạy supabase-marketplace-cms.sql.", "error");
  state.settings = settingsResult.data || null; state.pages = pagesResult.data || []; state.faqs = faqsResult.data || []; state.shops = shopsResult.data || [];
  renderMetrics(); renderProducts(); renderOrders(); renderRecentOrders(); renderSettings(); renderFaqs(); renderShops(); fillPageForm();
}

function renderMetrics() {
  const revenue = state.orders.filter((order) => ["paid", "processing", "completed"].includes(order.status)).reduce((sum, order) => sum + Number(order.total_amount), 0);
  const pending = state.orders.filter((order) => order.status === "pending_payment").length;
  const sale = state.products.filter((product) => product.is_sale).length;
  els.metricRevenue.textContent = currency(revenue); els.metricOrders.textContent = String(state.orders.length).padStart(2, "0"); els.metricProducts.textContent = String(state.products.length).padStart(2, "0"); els.metricPending.textContent = `${pending} đơn chờ thanh toán`; els.metricSale.textContent = `${sale} sản phẩm có ưu đãi`;
}

function renderRecentOrders() { els.recentOrders.innerHTML = state.orders.slice(0, 5).map(orderRow).join("") || emptyRow("Chưa có đơn hàng nào.", 5); }
function renderOrders() { const rows = state.orderFilter === "all" ? state.orders : state.orders.filter((order) => order.status === state.orderFilter); els.ordersBody.innerHTML = rows.map(orderRow).join("") || emptyRow("Không có đơn hàng thuộc trạng thái này.", 7); }
function orderRow(order) { return `<tr><td><b>${escapeHtml(order.order_number)}</b></td><td><span class="customer-email">${escapeHtml(shortId(order.user_id))}</span></td><td>${formatDate(order.created_at)}</td><td>${order.payment_method === "momo" ? "MoMo" : "VietQR"}</td><td><b>${currency(order.total_amount)}</b></td><td><span class="status-pill status-${escapeHtml(order.status)}">${statusLabel(order.status)}</span></td><td><select data-order-id="${escapeHtml(order.id)}">${statusOptions(order.status)}</select></td></tr>`; }
function statusOptions(current) { return ["pending_payment", "paid", "processing", "completed", "cancelled"].map((status) => `<option value="${status}" ${status === current ? "selected" : ""}>${statusLabel(status)}</option>`).join(""); }

function renderProducts() { const query = normalize(els.productSearch.value); const products = state.products.filter((product) => normalize(`${product.name} ${product.category}`).includes(query)); els.productCount.textContent = `${products.length} sản phẩm`; els.productsBody.innerHTML = products.map((product) => `<tr><td><div class="product-cell"><img src="${escapeHtml(product.image_url)}" alt="" /><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.slug)}</small></span></div></td><td>${escapeHtml(product.category)}</td><td><b>${currency(product.price)}</b></td><td>${product.stock}</td><td><span class="sale-pill ${product.is_sale ? "yes" : "no"}">${product.is_sale ? "SALE" : "STANDARD"}</span></td><td><button class="row-action" data-edit-product="${escapeHtml(product.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Không tìm thấy sản phẩm.", 6); }

function renderSettings() {
  if (!state.settings) return;
  const map = { "#settingSiteName": "site_name", "#settingTagline": "site_tagline", "#settingLogoUrl": "logo_url", "#settingAnnouncement": "announcement_text", "#settingEmail": "support_email", "#settingHours": "support_hours", "#settingAddress": "address_text", "#settingHeroKicker": "hero_kicker", "#settingHeroTitle": "hero_title", "#settingHeroEmphasis": "hero_emphasis", "#settingHeroDescription": "hero_description", "#settingHeroImage": "hero_image_url" };
  Object.entries(map).forEach(([selector, key]) => { $(selector).value = state.settings[key] || ""; });
}
function fillPageForm() { const page = state.pages.find((item) => item.slug === els.pageSelect.value); $("#pageTitle").value = page?.title || ""; $("#pageSubtitle").value = page?.subtitle || ""; $("#pageContent").value = page?.content || ""; }
function renderFaqs() { els.faqCount.textContent = state.faqs.length; els.faqBody.innerHTML = state.faqs.map((faq) => `<tr><td><span class="list-name">${escapeHtml(faq.question)}</span><span class="list-description">${escapeHtml(faq.answer)}</span></td><td><input class="status-toggle" type="checkbox" disabled ${faq.is_published ? "checked" : ""} /></td><td><button class="row-action" data-edit-faq="${escapeHtml(faq.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Chưa có FAQ.", 3); }
function renderShops() { els.shopsBody.innerHTML = state.shops.map((shop) => `<tr><td><div class="product-cell">${shop.banner_url ? `<img class="image-mini" src="${escapeHtml(shop.banner_url)}" alt="" />` : ""}<span><b>${escapeHtml(shop.name)}</b><small>${escapeHtml(shop.slug)}</small></span></div></td><td>${escapeHtml(shop.category)}</td><td class="customer-email">${escapeHtml(shop.contact_email || "—")}</td><td><span class="shop-flag ${shop.is_verified ? "" : "muted"}"><i class="fa-solid fa-circle-check"></i>${shop.is_verified ? "Verified" : "Chưa xác minh"}</span></td><td><span class="sale-pill ${shop.is_active ? "yes" : "no"}">${shop.is_active ? "ACTIVE" : "HIDDEN"}</span></td><td><button class="row-action" data-edit-shop="${escapeHtml(shop.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join("") || emptyRow("Chưa có gian hàng.", 6); }

function openProductModal(product = null) { state.editingProductId = product?.id || null; $("#productForm").reset(); $("#deleteProductButton").classList.toggle("hidden", !product); if (product) { $("#productId").value = product.id; $("#productName").value = product.name; $("#productCategory").value = product.category; $("#productStock").value = product.stock; $("#productDescription").value = product.description; $("#productImageUrl").value = product.image_url; $("#productPrice").value = product.price; $("#productOriginalPrice").value = product.original_price; $("#productSale").checked = product.is_sale; $("#productFeatured").checked = product.featured; } openModal("product"); }
function openFaqModal(faq = null) { state.editingFaqId = faq?.id || null; $("#faqForm").reset(); $("#deleteFaqButton").classList.toggle("hidden", !faq); $("#faqModalTitle").textContent = faq ? "Chỉnh sửa FAQ" : "Thêm FAQ"; if (faq) { $("#faqId").value = faq.id; $("#faqQuestion").value = faq.question; $("#faqAnswer").value = faq.answer; $("#faqSortOrder").value = faq.sort_order; $("#faqPublished").checked = faq.is_published; } openModal("faq"); }
function openShopModal(shop = null) { state.editingShopId = shop?.id || null; $("#shopForm").reset(); $("#deleteShopButton").classList.toggle("hidden", !shop); $("#shopModalTitle").textContent = shop ? "Chỉnh sửa gian hàng" : "Thêm gian hàng"; if (shop) { $("#shopId").value = shop.id; $("#shopName").value = shop.name; $("#shopCategory").value = shop.category; $("#shopEmail").value = shop.contact_email || ""; $("#shopDescription").value = shop.description; $("#shopBannerUrl").value = shop.banner_url || ""; $("#shopVerified").checked = shop.is_verified; $("#shopActive").checked = shop.is_active; } openModal("shop"); }
function openModal(name) { $("#" + name + "Modal").hidden = false; document.body.style.overflow = "hidden"; }
function closeModal(name) { $("#" + name + "Modal").hidden = true; document.body.style.overflow = ""; }

async function saveProduct(event) { event.preventDefault(); const name = $("#productName").value.trim(), price = Number($("#productPrice").value), originalPrice = Number($("#productOriginalPrice").value); if (originalPrice < price) return toast("Giá gốc phải lớn hơn hoặc bằng giá hiện tại.", "error"); const payload = { name, slug: slugify(name), category: $("#productCategory").value, stock: Number($("#productStock").value), description: $("#productDescription").value.trim(), image_url: $("#productImageUrl").value.trim(), price, original_price: originalPrice, is_sale: $("#productSale").checked, featured: $("#productFeatured").checked, updated_at: new Date().toISOString() }; const result = state.editingProductId ? await db.from("products").update(payload).eq("id", state.editingProductId) : await db.from("products").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("product"); toast("Đã lưu sản phẩm.", "success"); loadData(); }
async function deleteProduct() { if (!state.editingProductId || !window.confirm("Xóa sản phẩm này?")) return; const { error } = await db.from("products").delete().eq("id", state.editingProductId); if (error) return toast(error.message, "error"); closeModal("product"); toast("Đã xóa sản phẩm.", "success"); loadData(); }
async function updateOrderStatus(event) { const select = event.target.closest("[data-order-id]"); if (!select) return; const { error } = await db.from("orders").update({ status: select.value }).eq("id", select.dataset.orderId); if (error) return toast(error.message, "error"); const order = state.orders.find((item) => item.id === select.dataset.orderId); if (order) order.status = select.value; renderMetrics(); renderOrders(); renderRecentOrders(); toast("Đã cập nhật trạng thái đơn.", "success"); }

async function saveSettings(event) { event.preventDefault(); const fields = { site_name: "#settingSiteName", site_tagline: "#settingTagline", logo_url: "#settingLogoUrl", announcement_text: "#settingAnnouncement", support_email: "#settingEmail", support_hours: "#settingHours", address_text: "#settingAddress", hero_kicker: "#settingHeroKicker", hero_title: "#settingHeroTitle", hero_emphasis: "#settingHeroEmphasis", hero_description: "#settingHeroDescription", hero_image_url: "#settingHeroImage" }; const payload = { singleton: true, updated_at: new Date().toISOString() }; Object.entries(fields).forEach(([key, selector]) => { payload[key] = $(selector).value.trim(); }); const { error } = await db.from("site_settings").upsert(payload, { onConflict: "singleton" }); if (error) return toast(error.message, "error"); state.settings = payload; toast("Đã lưu nhận diện storefront.", "success"); }
async function savePage(event) { event.preventDefault(); const payload = { slug: els.pageSelect.value, title: $("#pageTitle").value.trim(), subtitle: $("#pageSubtitle").value.trim(), content: $("#pageContent").value.trim(), updated_at: new Date().toISOString() }; const { error } = await db.from("site_pages").upsert(payload, { onConflict: "slug" }); if (error) return toast(error.message, "error"); const index = state.pages.findIndex((item) => item.slug === payload.slug); if (index >= 0) state.pages[index] = payload; else state.pages.push(payload); toast("Đã lưu trang thông tin.", "success"); }
async function saveFaq(event) { event.preventDefault(); const payload = { question: $("#faqQuestion").value.trim(), answer: $("#faqAnswer").value.trim(), sort_order: Number($("#faqSortOrder").value), is_published: $("#faqPublished").checked, updated_at: new Date().toISOString() }; const result = state.editingFaqId ? await db.from("faqs").update(payload).eq("id", state.editingFaqId) : await db.from("faqs").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("faq"); toast("Đã lưu FAQ.", "success"); loadData(); }
async function deleteFaq() { if (!state.editingFaqId || !window.confirm("Xóa FAQ này?")) return; const { error } = await db.from("faqs").delete().eq("id", state.editingFaqId); if (error) return toast(error.message, "error"); closeModal("faq"); toast("Đã xóa FAQ.", "success"); loadData(); }
async function saveShop(event) { event.preventDefault(); const name = $("#shopName").value.trim(); const payload = { name, slug: slugify(name), category: $("#shopCategory").value.trim(), contact_email: $("#shopEmail").value.trim() || null, description: $("#shopDescription").value.trim(), banner_url: $("#shopBannerUrl").value.trim() || null, is_verified: $("#shopVerified").checked, is_active: $("#shopActive").checked, updated_at: new Date().toISOString() }; const result = state.editingShopId ? await db.from("shops").update(payload).eq("id", state.editingShopId) : await db.from("shops").insert(payload); if (result.error) return toast(result.error.message, "error"); closeModal("shop"); toast("Đã lưu gian hàng.", "success"); loadData(); }
async function deleteShop() { if (!state.editingShopId || !window.confirm("Xóa gian hàng này?")) return; const { error } = await db.from("shops").delete().eq("id", state.editingShopId); if (error) return toast(error.message, "error"); closeModal("shop"); toast("Đã xóa gian hàng.", "success"); loadData(); }

function activateView(view) { $$(".admin-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view)); $$("[data-admin-view]").forEach((section) => section.classList.toggle("active", section.dataset.adminView === view)); els.viewTitle.textContent = ({ overview: "Tổng quan vận hành", products: "Quản lý sản phẩm", orders: "Quản lý đơn hàng", brand: "Thương hiệu & banner", content: "Nội dung & FAQ", shops: "Gian hàng & đối tác" })[view] || "Command Deck"; }
function getProduct(id) { return state.products.find((product) => product.id === id); }
function setTableLoading() { const row = '<tr class="loading-row"><td colspan="7"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang đồng bộ dữ liệu...</td></tr>'; els.productsBody.innerHTML = row; els.ordersBody.innerHTML = row; els.recentOrders.innerHTML = row; }
function emptyRow(message, colspan) { return `<tr class="empty-row"><td colspan="${colspan}">${message}</td></tr>`; }
function currency(value) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function formatDate(value) { return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function statusLabel(status) { return ({ pending_payment: "Chờ thanh toán", paid: "Đã thanh toán", processing: "Đang xử lý", completed: "Hoàn thành", cancelled: "Đã hủy" })[status] || status; }
function shortId(value) { return value ? `${String(value).slice(0, 7)}…` : "—"; }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function slugify(value) { return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char])); }
function setLoading(button, loading, label = "Đang xử lý") { if (loading) { button.dataset.label = button.innerHTML; button.disabled = true; button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${label}`; } else { button.disabled = false; button.innerHTML = button.dataset.label || button.innerHTML; } }
function toast(message, type = "info") { const icon = type === "error" ? "fa-circle-exclamation" : type === "success" ? "fa-circle-check" : "fa-circle-info"; const element = document.createElement("div"); element.className = `toast ${type}`; element.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`; els.toastRegion.append(element); window.setTimeout(() => element.remove(), 3800); }
