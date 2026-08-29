import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const formatCurrency = value => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const formatTime = value => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value ? new Date(value) : new Date());

const state = { db: null, session: null, user: null, role: "customer", isAdmin: false };

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

function setGateMessage(message, type = "muted") {
  const element = $("#mantisGateMessage");
  element.textContent = message;
  element.className = `text-${type} mb-4`;
}

function setLoginLoading(loading) {
  const button = $("#mantisLoginButton");
  button.disabled = loading;
  button.querySelector("span").textContent = loading ? "Signing in…" : "Sign in to Command Deck";
  button.querySelector("i").className = loading ? "bi bi-arrow-repeat ms-2" : "bi bi-arrow-right ms-2";
}

function showApp() {
  $("#mantisGate").classList.add("d-none");
  $("#mantisApp").classList.remove("d-none");
}

function showGate() {
  $("#mantisApp").classList.add("d-none");
  $("#mantisGate").classList.remove("d-none");
}

function roleLabel(role) {
  return String(role || "customer").replaceAll("_", " ");
}

async function authorize(user) {
  if (!state.db || !user) return false;
  const [{ data: allowed, error: accessError }, { data: adminValue, error: adminError }, { data: roleData }] = await Promise.all([
    state.db.rpc("can_access_command_deck"),
    state.db.rpc("is_admin"),
    state.db.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  if (accessError || adminError) {
    setGateMessage("The authorization check could not be completed. Please try again.", "danger");
    return false;
  }
  state.isAdmin = Boolean(adminValue);
  state.role = roleData?.role || (state.isAdmin ? "admin" : "customer");
  if (!allowed) {
    setGateMessage("This account does not have Command Deck access. Ask an administrator to review the role.", "danger");
    return false;
  }
  return true;
}

async function loadMetrics() {
  const [{ data: orders, error: orderError }, { count: productCount, error: productError }] = await Promise.all([
    state.db.from("orders").select("payment_status,total_amount,created_at").order("created_at", { ascending: false }).limit(1000),
    state.db.from("products").select("id", { count: "exact", head: true }),
  ]);
  if (orderError || productError) {
    $("#mantisDbStatus").textContent = "Review required";
    $("#mantisDbStatus").className = "text-danger";
    showToast("Some dashboard metrics could not be loaded from Supabase.", "error");
    return;
  }
  const rows = orders || [];
  const paidStatuses = new Set(["paid", "processing", "completed"]);
  const confirmed = rows.filter(order => paidStatuses.has(order.payment_status));
  const revenue = confirmed.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const pending = rows.filter(order => order.payment_status === "pending_payment").length;
  $("#mantisRevenue").textContent = formatCurrency(revenue);
  $("#mantisOrders").textContent = String(rows.length);
  $("#mantisProducts").textContent = String(productCount ?? 0);
  $("#mantisCatalogRows").textContent = String(productCount ?? 0);
  $("#mantisPending").textContent = `${pending} pending payment`;
  $("#mantisLastSync").textContent = `Last sync: ${formatTime()}`;
}

function renderOperator() {
  const email = state.user?.email || "Operator";
  const initial = email.slice(0, 1).toUpperCase();
  const role = roleLabel(state.role);
  $("#mantisOperatorInitial").textContent = initial;
  $("#mantisOperatorName").textContent = email;
  $("#mantisOperatorRole").textContent = state.isAdmin ? "ADMIN · AUTHORIZED" : `${role.toUpperCase()} · AUTHORIZED`;
  $("#mantisRoleMetric").textContent = role;
  $("#mantisAccessEmail").textContent = email;
  $("#mantisAccessRole").textContent = role;
  $("#mantisAccessPermission").textContent = state.isAdmin ? "Admin access verified" : "Command Deck access verified";
}

function setView(view) {
  const titles = { overview: "Operations overview", catalog: "Catalog snapshot", operations: "Order operations", access: "Access & links" };
  $$("[data-mantis-panel]").forEach(panel => {
    const active = panel.dataset.mantisPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  $$("[data-mantis-view]").forEach(button => button.classList.toggle("active", button.dataset.mantisView === view));
  $("#mantisViewTitle").textContent = titles[view] || titles.overview;
  closeSidebar();
}

function openSidebar() {
  $("#mantisSidebar").classList.add("is-open");
  $("#mantisBackdrop").classList.add("is-visible");
}

function closeSidebar() {
  $("#mantisSidebar").classList.remove("is-open");
  $("#mantisBackdrop").classList.remove("is-visible");
}

async function bootSession(session) {
  state.session = session;
  state.user = session?.user || null;
  if (!state.user) {
    showGate();
    return;
  }
  const allowed = await authorize(state.user);
  if (!allowed) {
    await state.db.auth.signOut();
    state.session = null;
    state.user = null;
    return;
  }
  renderOperator();
  showApp();
  await loadMetrics();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = $("#mantisEmail").value.trim();
  const password = $("#mantisPassword").value;
  if (!email || !password) {
    setGateMessage("Enter both your email and password.", "danger");
    return;
  }
  setLoginLoading(true);
  const { data, error } = await state.db.auth.signInWithPassword({ email, password });
  setLoginLoading(false);
  if (error) {
    setGateMessage(error.message, "danger");
    return;
  }
  await bootSession(data.session);
}

async function handleSignOut() {
  await state.db.auth.signOut();
  state.session = null;
  state.user = null;
  closeSidebar();
  showGate();
  setGateMessage("You have been signed out. Sign in again to continue.", "muted");
}

function bindEvents() {
  $("#mantisLoginForm").addEventListener("submit", handleLogin);
  $("#mantisSignOut").addEventListener("click", handleSignOut);
  $("#openMantisSidebar").addEventListener("click", openSidebar);
  $("#closeMantisSidebar").addEventListener("click", closeSidebar);
  $("#mantisBackdrop").addEventListener("click", closeSidebar);
  $$("[data-mantis-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.mantisView)));
}

async function init() {
  bindEvents();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
    setGateMessage("Supabase is not configured. Set the public project URL and publishable key in supabase-config.js.", "danger");
    return;
  }
  state.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  state.db.auth.onAuthStateChange((_event, session) => {
    if (!session) showGate();
  });
  const { data, error } = await state.db.auth.getSession();
  if (error) {
    setGateMessage("Unable to restore the Supabase session. Please sign in again.", "danger");
    return;
  }
  await bootSession(data.session);
}

init();
