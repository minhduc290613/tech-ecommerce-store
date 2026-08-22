/* Circuit Atelier Admin — Supabase-backed admin console with RLS-enforced access. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

// Cấu hình được dùng chung tại supabase-config.js. Tuyệt đối không dùng service_role key ở đây.
const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const state = { user: null, products: [], orders: [], orderFilter: "all", editingProductId: null };
const els = {
  gate: $("#adminGate"), gateMessage: $("#gateMessage"), loginForm: $("#adminLoginForm"), loginEmail: $("#adminEmail"), loginPassword: $("#adminPassword"), loginButton: $("#adminLoginButton"), app: $("#adminApp"),
  operatorName: $("#operatorName"), operatorInitial: $("#operatorInitial"), signOut: $("#adminSignOut"), viewTitle: $("#viewTitle"),
  metricRevenue: $("#metricRevenue"), metricOrders: $("#metricOrders"), metricProducts: $("#metricProducts"), metricPending: $("#metricPending"), metricSale: $("#metricSale"), recentOrders: $("#recentOrdersBody"),
  productCount: $("#adminProductCount"), productSearch: $("#adminProductSearch"), productsBody: $("#productsTableBody"), newProduct: $("#newProductButton"),
  refreshOrders: $("#refreshOrdersButton"), ordersBody: $("#ordersTableBody"), orderFilters: $("#orderFilters"),
  productModal: $("#productModal"), productModalTitle: $("#productModalTitle"), productForm: $("#productForm"), productId: $("#productId"), productName: $("#productName"), productCategory: $("#productCategory"), productStock: $("#productStock"), productDescription: $("#productDescription"), productImageUrl: $("#productImageUrl"), productPrice: $("#productPrice"), productOriginalPrice: $("#productOriginalPrice"), productSale: $("#productSale"), productFeatured: $("#productFeatured"), deleteProduct: $("#deleteProductButton"), saveProduct: $("#saveProductButton"), toastRegion: $("#adminToastRegion"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  if (!db) { els.gateMessage.textContent = "Hãy điền SUPABASE_URL và SUPABASE_ANON_KEY trong supabase-config.js trước khi đăng nhập."; return; }
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
  els.productForm.addEventListener("submit", saveProduct);
  els.deleteProduct.addEventListener("click", deleteProduct);
  els.productsBody.addEventListener("click", (event) => { const button = event.target.closest("[data-edit-product]"); if (button) openProductModal(getProduct(button.dataset.editProduct)); });
  els.productSearch.addEventListener("input", renderProducts);
  els.orderFilters.addEventListener("click", (event) => { const button = event.target.closest("[data-order-filter]"); if (!button) return; state.orderFilter = button.dataset.orderFilter; $$("button", els.orderFilters).forEach((item) => item.classList.toggle("active", item === button)); renderOrders(); });
  els.ordersBody.addEventListener("change", updateOrderStatus);
  els.refreshOrders.addEventListener("click", loadData);
  $$("[data-close-admin-modal]").forEach((button) => button.addEventListener("click", closeProductModal));
  els.productModal.addEventListener("click", (event) => { if (event.target === els.productModal) closeProductModal(); });
}

async function login(event) {
  event.preventDefault();
  if (!db) return;
  const email = els.loginEmail.value.trim(); const password = els.loginPassword.value;
  if (!email || !password) { toast("Nhập email và mật khẩu để tiếp tục.", "error"); return; }
  setLoading(els.loginButton, true, "Đang xác thực");
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  setLoading(els.loginButton, false);
  if (error) { toast(error.message, "error"); return; }
  await verifyAdmin(data.user);
}

async function verifyAdmin(user) {
  const { data: allowed, error } = await db.rpc("is_admin");
  if (error || !allowed) { await db.auth.signOut(); showGate("Tài khoản này chưa có quyền quản trị. Hãy thêm email vào bảng admin_users theo supabase-admin.sql."); return; }
  state.user = user; els.operatorName.textContent = user.email || "Admin"; els.operatorInitial.textContent = (user.email || "A").charAt(0).toUpperCase(); els.gate.hidden = true; els.app.hidden = false; await loadData();
}

async function signOut() { if (db) await db.auth.signOut(); showGate("Bạn đã đăng xuất khỏi Command Deck."); }
function showGate(message) { state.user = null; els.app.hidden = true; els.gate.hidden = false; els.gateMessage.textContent = message; els.loginPassword.value = ""; }

async function loadData() {
  if (!db) return;
  setTableLoading();
  const [productsResult, ordersResult] = await Promise.all([
    db.from("products").select("*").order("created_at", { ascending: false }),
    db.from("orders").select("id, order_number, user_id, total_amount, status, payment_method, payment_note, created_at").order("created_at", { ascending: false }),
  ]);
  if (productsResult.error || ordersResult.error) { toast(productsResult.error?.message || ordersResult.error?.message || "Không tải được dữ liệu quản trị.", "error"); return; }
  state.products = productsResult.data || []; state.orders = ordersResult.data || []; renderMetrics(); renderProducts(); renderOrders(); renderRecentOrders();
}

function renderMetrics() {
  const paidRevenue = state.orders.filter((order) => order.status === "paid" || order.status === "processing" || order.status === "completed").reduce((sum, order) => sum + Number(order.total_amount), 0);
  const pending = state.orders.filter((order) => order.status === "pending_payment").length; const sale = state.products.filter((product) => product.is_sale).length;
  els.metricRevenue.textContent = currency(paidRevenue); els.metricOrders.textContent = state.orders.length.toString().padStart(2, "0"); els.metricProducts.textContent = state.products.length.toString().padStart(2, "0"); els.metricPending.textContent = `${pending} đơn chờ thanh toán`; els.metricSale.textContent = `${sale} sản phẩm có ưu đãi`;
}

function renderRecentOrders() { els.recentOrders.innerHTML = state.orders.slice(0, 5).map(orderRow).join("") || emptyRow("Chưa có đơn hàng nào.", 5); }
function renderOrders() { const orders = state.orderFilter === "all" ? state.orders : state.orders.filter((order) => order.status === state.orderFilter); els.ordersBody.innerHTML = orders.map(orderRow).join("") || emptyRow("Không có đơn hàng thuộc trạng thái này.", 7); }
function orderRow(order) { return `<tr><td><b>${escapeHtml(order.order_number)}</b></td><td><span class="customer-email">${escapeHtml(shortId(order.user_id))}</span></td><td>${formatDate(order.created_at)}</td><td>${order.payment_method === "momo" ? "MoMo" : "VietQR"}</td><td><b>${currency(order.total_amount)}</b></td><td><span class="status-pill status-${escapeHtml(order.status)}">${statusLabel(order.status)}</span></td><td><select class="status-select" data-order-id="${escapeHtml(order.id)}" aria-label="Cập nhật trạng thái ${escapeHtml(order.order_number)}">${statusOptions(order.status)}</select></td></tr>`; }
function statusOptions(current) { return ["pending_payment", "paid", "processing", "completed", "cancelled"].map((status) => `<option value="${status}" ${status === current ? "selected" : ""}>${statusLabel(status)}</option>`).join(""); }

function renderProducts() { const search = normalize(els.productSearch.value); const products = state.products.filter((product) => normalize(`${product.name} ${product.category}`).includes(search)); els.productCount.textContent = `${products.length} sản phẩm`; els.productsBody.innerHTML = products.map((product) => `<tr><td><div class="product-cell"><img src="${escapeHtml(product.image_url)}" alt="" /><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.slug)}</small></span></div></td><td>${escapeHtml(product.category)}</td><td><b>${currency(product.price)}</b><br /><small>${Number(product.original_price) > Number(product.price) ? `<s>${currency(product.original_price)}</s>` : ""}</small></td><td>${Number(product.stock)}</td><td><span class="sale-pill ${product.is_sale ? "yes" : "no"}">${product.is_sale ? "SALE" : "STANDARD"}</span></td><td><button class="row-action" data-edit-product="${escapeHtml(product.id)}" type="button" aria-label="Chỉnh sửa ${escapeHtml(product.name)}"><i class="fa-solid fa-pen" aria-hidden="true"></i></button></td></tr>`).join("") || emptyRow("Không tìm thấy sản phẩm.", 6); }

function openProductModal(product = null) {
  state.editingProductId = product?.id || null; els.productForm.reset(); els.productId.value = product?.id || ""; els.productModalTitle.textContent = product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"; els.deleteProduct.classList.toggle("hidden", !product);
  if (product) { els.productName.value = product.name; els.productCategory.value = product.category; els.productStock.value = product.stock; els.productDescription.value = product.description; els.productImageUrl.value = product.image_url; els.productPrice.value = product.price; els.productOriginalPrice.value = product.original_price; els.productSale.checked = product.is_sale; els.productFeatured.checked = product.featured; }
  els.productModal.hidden = false; document.body.style.overflow = "hidden"; requestAnimationFrame(() => els.productName.focus());
}
function closeProductModal() { els.productModal.hidden = true; document.body.style.overflow = ""; }
async function saveProduct(event) {
  event.preventDefault(); const price = Number(els.productPrice.value); const originalPrice = Number(els.productOriginalPrice.value);
  if (originalPrice < price) { toast("Giá gốc phải lớn hơn hoặc bằng giá hiện tại.", "error"); return; }
  const name = els.productName.value.trim(); const payload = { name, slug: slugify(name), category: els.productCategory.value, stock: Number(els.productStock.value), description: els.productDescription.value.trim(), image_url: els.productImageUrl.value.trim(), price, original_price: originalPrice, is_sale: els.productSale.checked, featured: els.productFeatured.checked, updated_at: new Date().toISOString() };
  setLoading(els.saveProduct, true, "Đang lưu"); const result = state.editingProductId ? await db.from("products").update(payload).eq("id", state.editingProductId) : await db.from("products").insert(payload); setLoading(els.saveProduct, false);
  if (result.error) { toast(result.error.message, "error"); return; } closeProductModal(); toast(state.editingProductId ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm mới.", "success"); await loadData();
}
async function deleteProduct() { if (!state.editingProductId || !window.confirm("Xóa sản phẩm này khỏi catalog?")) return; const { error } = await db.from("products").delete().eq("id", state.editingProductId); if (error) { toast(error.message, "error"); return; } closeProductModal(); toast("Đã xóa sản phẩm.", "success"); await loadData(); }
async function updateOrderStatus(event) { const select = event.target.closest("[data-order-id]"); if (!select) return; select.disabled = true; const { error } = await db.from("orders").update({ status: select.value }).eq("id", select.dataset.orderId); select.disabled = false; if (error) { toast(error.message, "error"); await loadData(); return; } const order = state.orders.find((item) => item.id === select.dataset.orderId); if (order) order.status = select.value; renderMetrics(); renderOrders(); renderRecentOrders(); toast("Đã cập nhật trạng thái đơn hàng.", "success"); }

function activateView(view) { $$(".admin-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view)); $$("[data-admin-view]").forEach((section) => section.classList.toggle("active", section.dataset.adminView === view)); els.viewTitle.textContent = ({ overview: "Tổng quan vận hành", products: "Quản lý sản phẩm", orders: "Quản lý đơn hàng" })[view] || "Command Deck"; }
function getProduct(id) { return state.products.find((product) => product.id === id); }
function setTableLoading() { const loading = '<tr class="loading-row"><td colspan="7"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Đang đồng bộ dữ liệu...</td></tr>'; els.productsBody.innerHTML = loading; els.ordersBody.innerHTML = loading; els.recentOrders.innerHTML = loading; }
function emptyRow(message, colspan) { return `<tr class="empty-row"><td colspan="${colspan}">${message}</td></tr>`; }
function currency(value) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function formatDate(value) { return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function statusLabel(status) { return ({ pending_payment: "Chờ thanh toán", paid: "Đã thanh toán", processing: "Đang xử lý", completed: "Hoàn thành", cancelled: "Đã hủy" })[status] || status; }
function shortId(value) { return value ? `${String(value).slice(0, 7)}…` : "—"; }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function slugify(value) { return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `san-pham-${Date.now()}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char])); }
function setLoading(button, loading, text = "Đang xử lý") { if (loading) { button.dataset.label = button.innerHTML; button.disabled = true; button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ${text}`; } else { button.disabled = false; button.innerHTML = button.dataset.label || button.innerHTML; } }
function toast(message, type = "info") { const icon = type === "error" ? "fa-circle-exclamation" : type === "success" ? "fa-circle-check" : "fa-circle-info"; const element = document.createElement("div"); element.className = `toast ${type}`; element.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`; els.toastRegion.append(element); window.setTimeout(() => element.remove(), 3800); }
