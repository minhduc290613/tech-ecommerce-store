import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const CURRENCY_RATES = { VND: 1, USD: 0.000039, EUR: 0.000036, GBP: 0.000031, JPY: 0.0058, CNY: 0.00028, KRW: 0.052, SGD: 0.00005, THB: 0.00137, AUD: 0.00006, CAD: 0.000053 };
const CURRENCY_LOCALES = { VND: "vi-VN", USD: "en-US", EUR: "de-DE", GBP: "en-GB", JPY: "ja-JP", CNY: "zh-CN", KRW: "ko-KR", SGD: "en-SG", THB: "th-TH", AUD: "en-AU", CAD: "en-CA" };
const formatCurrency = value => new Intl.NumberFormat(CURRENCY_LOCALES[state.currency] || "vi-VN", { style: "currency", currency: state.currency, maximumFractionDigits: state.currency === "VND" || state.currency === "JPY" || state.currency === "KRW" ? 0 : 2 }).format(Number(value || 0) * (CURRENCY_RATES[state.currency] || 1));
const formatTime = value => new Intl.DateTimeFormat(state.language === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value ? new Date(value) : new Date());

const COPY = {
  en: {
    overview: "Operations overview", orderOperations: "Order operations", productManagement: "Product management", userManagement: "User management", accessLinks: "Access & links", systemStatus: "System status", authSession: "Auth session", database: "Database", permissions: "Permissions", storefront: "Storefront", dark: "Dark", light: "Light", navigation: "NAVIGATION", synced: "Supabase synced", separate: "Separate admin interface.", separateText: "This Mantis variant is a dashboard shell and quick-launch surface. Full editing workspaces remain available in the original Command Deck.", revenueOverview: "Revenue overview", revenueOverviewIntro: "Confirmed revenue from the last seven calendar days.", dailyRevenue: "Daily revenue", latestOrders: "Latest orders", viewAll: "View all", orderNumber: "Order", orderStatus: "Status", orderTotal: "Total", confirmedRevenue: "Confirmed revenue", confirmedRevenueNote: "Paid, processing and completed orders", totalOrders: "Total orders", catalogProducts: "Catalog products", currentAccess: "Current access", catalogRows: "Catalog rows", dataSource: "Data source", editingMode: "Editing mode", openProductManager: "Open product manager", orderManager: "Open order manager", visibleProfiles: "Visible profiles", rlsProfileNote: "Count returned by the current RLS scope.", openUserManager: "Open user manager", privacyFirst: "Privacy first", privacyFirstText: "This dashboard never exposes passwords or service-role credentials. Account bans, balance changes and role assignments remain in the full protected workspace.", accessIntro: "Use the same account and permission model across all NEXORA admin surfaces.", capabilityPassed: "Capability check passed", authorizedOperator: "Authorized operator", adminAccess: "Admin access", adminVerified: "Admin access verified", commandVerified: "Command Deck access verified", fullEnglish: "Full English Admin", vietnamese: "Vietnamese Admin", customerOrders: "Customer orders", signOut: "Sign out", pendingPayment: "pending payment", verified: "Verified", connected: "Connected", checked: "Checked", reviewRequired: "Review required", loading: "Loading…", noOrders: "No recent orders", revenueEmpty: "No confirmed revenue in this period", status: { pending_payment: "Pending", paid: "Paid", processing: "Processing", completed: "Completed", cancelled: "Cancelled" }, loginMessage: "Sign in with an authorized NEXORA account to continue.", signIn: "Sign in to Command Deck", signingIn: "Signing in…", signedOut: "You have been signed out. Sign in again to continue.", invalidCredentials: "Enter both your email and password.", authError: "The authorization check could not be completed. Please try again.", denied: "This account does not have Command Deck access. Ask an administrator to review the role.", restoreError: "Unable to restore the Supabase session. Please sign in again.", notConfigured: "Supabase is not configured. Set the public project URL and publishable key in supabase-config.js.", metricsError: "Some dashboard metrics could not be loaded from Supabase.", fullDeck: "Full English Command Deck", fullDeckNote: "CMS, products, orders, roles and notifications.", vnDeck: "Vietnamese Command Deck", vnDeckNote: "Original Command Deck with all existing modules.", customerOrderNote: "Review the customer-facing order experience.", paymentConfirmation: "Payment confirmation", paymentNote: "Bank transfer, balance and manual confirmation workflows.", fulfillment: "Fulfillment", fulfillmentNote: "Carrier, tracking code, delivery status and shipment notes.", notifications: "Notifications", notificationsNote: "Customer notification center and Admin/MKT broadcasts.", manage: "Manage", rlsProtected: "RLS-protected query", fullDeckMode: "Full Command Deck", useButton: "Use the button above to edit safely.", lastSync: "Last sync", email: "Email", role: "Role", userManagerNote: "Review authorized customer profiles and open the full role/account manager for changes.", productManagerNote: "Review catalog health and open the full product manager for editing." },
  vi: {
    overview: "Tổng quan vận hành", orderOperations: "Vận hành đơn hàng", productManagement: "Quản lý sản phẩm", userManagement: "Quản lý người dùng", accessLinks: "Quyền & liên kết", systemStatus: "Trạng thái hệ thống", authSession: "Phiên xác thực", database: "Cơ sở dữ liệu", permissions: "Phân quyền", storefront: "Gian hàng", dark: "Tối", light: "Sáng", navigation: "ĐIỀU HƯỚNG", synced: "Đã đồng bộ Supabase", separate: "Giao diện quản trị phụ.", separateText: "Mantis là dashboard và điểm mở nhanh. Các workspace chỉnh sửa đầy đủ vẫn nằm trong Command Deck hiện tại.", revenueOverview: "Tổng quan doanh thu", revenueOverviewIntro: "Doanh thu các đơn đã xác nhận trong 7 ngày gần nhất.", dailyRevenue: "Doanh thu theo ngày", latestOrders: "Đơn hàng mới nhất", viewAll: "Xem tất cả", orderNumber: "Đơn hàng", orderStatus: "Trạng thái", orderTotal: "Tổng", confirmedRevenue: "Doanh thu đã xác nhận", confirmedRevenueNote: "Đơn đã thanh toán, đang xử lý và hoàn tất", totalOrders: "Tổng đơn hàng", catalogProducts: "Sản phẩm catalog", currentAccess: "Quyền hiện tại", catalogRows: "Số dòng catalog", dataSource: "Nguồn dữ liệu", editingMode: "Chế độ chỉnh sửa", openProductManager: "Mở quản lý sản phẩm", orderManager: "Mở quản lý đơn hàng", visibleProfiles: "Hồ sơ nhìn thấy", rlsProfileNote: "Số lượng trả về theo phạm vi RLS hiện tại.", openUserManager: "Mở quản lý người dùng", privacyFirst: "Ưu tiên riêng tư", privacyFirstText: "Dashboard không hiển thị mật khẩu hoặc service-role credential. Ban tài khoản, biến động số dư và đổi role vẫn thực hiện ở workspace được bảo vệ.", accessIntro: "Dùng cùng tài khoản và mô hình phân quyền trên mọi giao diện quản trị NEXORA.", capabilityPassed: "Đã kiểm tra capability", authorizedOperator: "Người vận hành được cấp quyền", adminAccess: "Quyền quản trị", adminVerified: "Đã xác minh quyền Admin", commandVerified: "Đã xác minh quyền Command Deck", fullEnglish: "Admin tiếng Anh đầy đủ", vietnamese: "Admin tiếng Việt", customerOrders: "Đơn hàng khách", signOut: "Đăng xuất", pendingPayment: "chờ thanh toán", verified: "Đã xác minh", connected: "Đã kết nối", checked: "Đã kiểm tra", reviewRequired: "Cần kiểm tra", loading: "Đang tải…", noOrders: "Chưa có đơn gần đây", revenueEmpty: "Chưa có doanh thu đã xác nhận trong kỳ này", status: { pending_payment: "Chờ thanh toán", paid: "Đã thanh toán", processing: "Đang xử lý", completed: "Hoàn tất", cancelled: "Đã hủy" }, loginMessage: "Đăng nhập bằng tài khoản NEXORA được cấp quyền để tiếp tục.", signIn: "Đăng nhập Command Deck", signingIn: "Đang đăng nhập…", signedOut: "Bạn đã đăng xuất. Hãy đăng nhập lại để tiếp tục.", invalidCredentials: "Hãy nhập cả email và mật khẩu.", authError: "Không thể hoàn tất kiểm tra quyền. Vui lòng thử lại.", denied: "Tài khoản này chưa có quyền truy cập Command Deck. Hãy nhờ quản trị viên kiểm tra role.", restoreError: "Không thể khôi phục phiên Supabase. Vui lòng đăng nhập lại.", notConfigured: "Supabase chưa được cấu hình. Hãy đặt URL project và publishable key trong supabase-config.js.", metricsError: "Không tải được một phần số liệu từ Supabase.", fullDeck: "Admin tiếng Anh đầy đủ", fullDeckNote: "CMS, sản phẩm, đơn hàng, role và thông báo.", vnDeck: "Admin tiếng Việt", vnDeckNote: "Command Deck gốc với toàn bộ module.", customerOrderNote: "Xem trải nghiệm đơn hàng phía khách.", paymentConfirmation: "Xác nhận thanh toán", paymentNote: "Chuyển khoản, số dư và xác nhận thủ công.", fulfillment: "Giao nhận", fulfillmentNote: "Đơn vị giao, mã vận đơn, trạng thái và ghi chú.", notifications: "Thông báo", notificationsNote: "Trung tâm thông báo và broadcast Admin/MKT.", manage: "Quản lý", rlsProtected: "Truy vấn được bảo vệ bởi RLS", fullDeckMode: "Command Deck đầy đủ", useButton: "Dùng nút phía trên để chỉnh sửa an toàn.", lastSync: "Đồng bộ lần cuối", email: "Email", role: "Role", userManagerNote: "Xem hồ sơ khách được phép truy cập và mở quản lý tài khoản/role đầy đủ để thay đổi.", productManagerNote: "Kiểm tra catalog và mở quản lý sản phẩm đầy đủ để chỉnh sửa." },
};

const state = { db: null, session: null, user: null, role: "customer", isAdmin: false, language: localStorage.getItem("nexora-mantis-language") || "en", theme: localStorage.getItem("nexora-mantis-theme") || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"), currency: localStorage.getItem("nexora-currency") || "VND", orders: [] };
const t = key => key.split(".").reduce((value, part) => value?.[part], COPY[state.language]) ?? key;

function showToast(message, type = "info") {
  const color = type === "error" ? "danger" : type === "success" ? "success" : "primary";
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${color} border-0`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>`;
  toast.querySelector(".toast-body").textContent = message;
  $("#mantisToastRegion").append(toast);
  const instance = window.bootstrap?.Toast ? new window.bootstrap.Toast(toast, { delay: 4200 }) : null;
  toast.querySelector(".btn-close").addEventListener("click", () => toast.remove());
  instance?.show();
  if (!instance) window.setTimeout(() => toast.remove(), 4200);
}

function setGateMessage(message, type = "muted") { const element = $("#mantisGateMessage"); element.textContent = message; element.className = `text-${type} mb-4`; }
function setLoginLoading(loading) { const button = $("#mantisLoginButton"); button.disabled = loading; button.querySelector("span").textContent = loading ? t("signingIn") : t("signIn"); button.querySelector("i").className = loading ? "bi bi-arrow-repeat ms-2" : "bi bi-arrow-right ms-2"; }
function showApp() { $("#mantisGate").classList.add("d-none"); $("#mantisApp").classList.remove("d-none"); }
function showGate() { $("#mantisApp").classList.add("d-none"); $("#mantisGate").classList.remove("d-none"); }
function roleLabel(role) { return String(role || "customer").replaceAll("_", " "); }

function applyTheme() {
  document.body.dataset.theme = state.theme;
  const button = $("#mantisThemeToggle");
  const dark = state.theme === "dark";
  button.setAttribute("aria-pressed", String(dark));
  button.querySelector("i").className = dark ? "bi bi-sun" : "bi bi-moon-stars";
  button.querySelector("span").textContent = dark ? t("light") : t("dark");
}

function applyLanguage() {
  document.documentElement.lang = state.language === "vi" ? "vi" : "en";
  $$('[data-i18n]').forEach(element => { const value = t(element.dataset.i18n); if (value !== element.dataset.i18n) element.textContent = value; });
  const view = document.querySelector(".mantis-nav .active")?.dataset.mantisView || "overview";
  setView(view, false);
  $("#mantisLanguageToggle").querySelector("span").textContent = state.language === "en" ? "VI" : "EN";
  $("#mantisGateMessage").textContent = t("loginMessage");
  setLoginLoading(false);
  const currencySelect = $("#mantisCurrencySelect"); if (currencySelect) currencySelect.value = state.currency;
  applyTheme();
  renderOperator();
  renderCharts(state.orders);
  renderLatestOrders(state.orders);
}

async function authorize(user) {
  if (!state.db || !user) return false;
  const [{ data: allowed, error: accessError }, { data: adminValue, error: adminError }, { data: roleData }] = await Promise.all([state.db.rpc("can_access_command_deck"), state.db.rpc("is_admin"), state.db.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()]);
  if (accessError || adminError) { setGateMessage(t("authError"), "danger"); return false; }
  state.isAdmin = Boolean(adminValue); state.role = roleData?.role || (state.isAdmin ? "admin" : "customer");
  if (!allowed) { setGateMessage(t("denied"), "danger"); return false; }
  return true;
}

function dateKey(date) { return date.toISOString().slice(0, 10); }
function getRevenueSeries(rows) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const series = Array.from({ length: 7 }, (_, index) => { const date = new Date(now); date.setDate(now.getDate() - (6 - index)); return { key: dateKey(date), date, amount: 0 }; });
  const index = new Map(series.map(item => [item.key, item]));
  const paidStatuses = new Set(["paid", "processing", "completed"]);
  rows.filter(row => paidStatuses.has(row.status)).forEach(row => { const item = index.get(dateKey(new Date(row.created_at))); if (item) item.amount += Number(row.total_amount || 0); });
  return series;
}
function renderCharts(rows) {
  const chart = $("#mantisRevenueChart"); if (!chart) return;
  const series = getRevenueSeries(rows); const max = Math.max(...series.map(item => item.amount), 1); const total = series.reduce((sum, item) => sum + item.amount, 0);
  $("#mantisRevenueChartTotal").textContent = formatCurrency(total);
  chart.innerHTML = "";
  series.forEach(item => { const column = document.createElement("div"); column.className = "revenue-column"; const bar = document.createElement("div"); bar.className = "revenue-bar"; bar.style.height = `${Math.max(item.amount ? (item.amount / max) * 100 : 4, 4)}%`; bar.title = `${item.date.toLocaleDateString(state.language === "vi" ? "vi-VN" : "en-GB")}: ${formatCurrency(item.amount)}`; const label = document.createElement("span"); label.textContent = item.date.toLocaleDateString(state.language === "vi" ? "vi-VN" : "en-GB", { weekday: "short" }); column.append(bar, label); chart.append(column); });
}
function renderLatestOrders(rows) {
  const body = $("#mantisLatestOrders"); if (!body) return; body.innerHTML = "";
  rows.slice(0, 6).forEach(order => { const tr = document.createElement("tr"); const number = document.createElement("td"); number.className = "fw-semibold text-nowrap"; number.textContent = order.order_number || "—"; const status = document.createElement("td"); const badge = document.createElement("span"); badge.className = `badge status-${order.status || "pending_payment"}`; badge.textContent = t(`status.${order.status}`) || roleLabel(order.status); status.append(badge); const total = document.createElement("td"); total.className = "text-end text-nowrap"; total.textContent = formatCurrency(order.total_amount); tr.append(number, status, total); body.append(tr); });
  if (!rows.length) { const tr = document.createElement("tr"); tr.innerHTML = `<td colspan="3" class="text-secondary"></td>`; tr.querySelector("td").textContent = t("noOrders"); body.append(tr); }
}

async function loadMetrics() {
  const [{ data: orders, error: orderError }, { count: productCount, error: productError }, { count: userCount, error: userError }] = await Promise.all([
    state.db.from("orders").select("order_number,status,total_amount,created_at").order("created_at", { ascending: false }).limit(1000),
    state.db.from("products").select("id", { count: "exact", head: true }),
    state.db.from("customer_profiles").select("user_id", { count: "exact", head: true }),
  ]);
  if (orderError || productError) { $("#mantisDbStatus").textContent = t("reviewRequired"); $("#mantisDbStatus").className = "text-danger"; showToast(t("metricsError"), "error"); return; }
  const rows = orders || []; state.orders = rows; const paidStatuses = new Set(["paid", "processing", "completed"]); const revenue = rows.filter(order => paidStatuses.has(order.status)).reduce((sum, order) => sum + Number(order.total_amount || 0), 0); const pending = rows.filter(order => order.status === "pending_payment").length;
  $("#mantisRevenue").textContent = formatCurrency(revenue); $("#mantisOrders").textContent = String(rows.length); $("#mantisProducts").textContent = String(productCount ?? 0); $("#mantisCatalogRows").textContent = String(productCount ?? 0); $("#mantisUsers").textContent = userError ? "—" : String(userCount ?? 0); $("#mantisPending").textContent = `${pending} ${t("pendingPayment")}`; $("#mantisLastSync").textContent = `${t("lastSync")}: ${formatTime()}`; renderCharts(rows); renderLatestOrders(rows);
}

function renderOperator() { const email = state.user?.email || "Operator"; const role = roleLabel(state.role); $("#mantisOperatorInitial").textContent = email.slice(0, 1).toUpperCase(); $("#mantisOperatorName").textContent = email; $("#mantisOperatorRole").textContent = state.isAdmin ? "ADMIN · AUTHORIZED" : `${role.toUpperCase()} · AUTHORIZED`; $("#mantisRoleMetric").textContent = role; $("#mantisAccessEmail").textContent = email; $("#mantisAccessRole").textContent = role; $("#mantisAccessPermission").textContent = state.isAdmin ? t("adminVerified") : t("commandVerified"); }

function setView(view, close = true) { const titles = { overview: "overview", operations: "orderOperations", products: "productManagement", users: "userManagement", access: "accessLinks" }; $$('[data-mantis-panel]').forEach(panel => { const active = panel.dataset.mantisPanel === view; panel.hidden = !active; panel.classList.toggle("active", active); }); $$('[data-mantis-view]').forEach(button => button.classList.toggle("active", button.dataset.mantisView === view)); $("#mantisViewTitle").textContent = t(titles[view] || "overview"); if (close) closeSidebar(); }
function openSidebar() { $("#mantisSidebar").classList.add("is-open"); $("#mantisBackdrop").classList.add("is-visible"); }
function closeSidebar() { $("#mantisSidebar").classList.remove("is-open"); $("#mantisBackdrop").classList.remove("is-visible"); }

async function bootSession(session) { state.session = session; state.user = session?.user || null; if (!state.user) { showGate(); return; } const allowed = await authorize(state.user); if (!allowed) { await state.db.auth.signOut(); state.session = null; state.user = null; return; } renderOperator(); showApp(); await loadMetrics(); }
async function handleLogin(event) { event.preventDefault(); const email = $("#mantisEmail").value.trim(); const password = $("#mantisPassword").value; if (!email || !password) { setGateMessage(t("invalidCredentials"), "danger"); return; } setLoginLoading(true); const { data, error } = await state.db.auth.signInWithPassword({ email, password }); setLoginLoading(false); if (error) { setGateMessage(error.message, "danger"); return; } await bootSession(data.session); }
async function handleSignOut() { await state.db.auth.signOut(); state.session = null; state.user = null; closeSidebar(); showGate(); setGateMessage(t("signedOut"), "muted"); }

function bindEvents() { $("#mantisLoginForm").addEventListener("submit", handleLogin); $("#mantisSignOut").addEventListener("click", handleSignOut); $("#openMantisSidebar").addEventListener("click", openSidebar); $("#closeMantisSidebar").addEventListener("click", closeSidebar); $("#mantisBackdrop").addEventListener("click", closeSidebar); $("#mantisLanguageToggle").addEventListener("click", () => { state.language = state.language === "en" ? "vi" : "en"; localStorage.setItem("nexora-mantis-language", state.language); applyLanguage(); }); $("#mantisCurrencySelect").addEventListener("change", event => { state.currency = event.target.value; localStorage.setItem("nexora-currency", state.currency); renderCharts(state.orders); renderLatestOrders(state.orders); if (state.orders.length) { loadMetrics(); } }); $("#mantisThemeToggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; localStorage.setItem("nexora-mantis-theme", state.theme); applyTheme(); }); $$('[data-mantis-view]').forEach(button => button.addEventListener("click", () => setView(button.dataset.mantisView))); }

async function init() { bindEvents(); applyLanguage(); if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) { setGateMessage(t("notConfigured"), "danger"); return; } state.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); state.db.auth.onAuthStateChange((_event, session) => { if (!session) showGate(); }); const { data, error } = await state.db.auth.getSession(); if (error) { setGateMessage(t("restoreError"), "danger"); return; } await bootSession(data.session); }

init();
