import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import "./notification-center.css";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = window.nexoraDb || (configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
const $ = (selector, parent = document) => parent.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]);
const state = { notifications: [], user: null, loading: false };

if (db) {
  window.addEventListener("nexora:app-ready", init, { once: true });
  document.addEventListener("DOMContentLoaded", () => { if (window.nexoraDb) init(); }, { once: true });
}

async function init() {
  if (document.querySelector("#notificationCenter")) return;
  mount();
  const { data } = await db.auth.getSession();
  state.user = data.session?.user || null;
  await refresh();
  db.auth.onAuthStateChange((_event, session) => { state.user = session?.user || null; refresh(); });
}

function mount() {
  document.body.insertAdjacentHTML("beforeend", `<section class="notification-center" id="notificationCenter" role="dialog" aria-modal="true" aria-labelledby="notificationCenterTitle" aria-hidden="true" hidden><div class="notification-center-card"><div class="notification-center-header"><div><span class="panel-label">SIGNAL CENTER</span><h2 id="notificationCenterTitle">Thông báo</h2></div><button class="icon-button" id="closeNotificationCenter" type="button" aria-label="Đóng thông báo"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><div class="notification-center-toolbar"><p id="notificationCenterSummary">Chưa có thông báo mới.</p><button class="quiet-button" id="markNotificationsRead" type="button">Đánh dấu đã đọc</button></div><div class="notification-center-list" id="notificationCenterList" aria-live="polite"></div></div></section>`);
  $("#notificationButton")?.addEventListener("click", () => setOpen(true));
  $("#closeNotificationCenter")?.addEventListener("click", () => setOpen(false));
  $("#notificationCenter")?.addEventListener("click", (event) => { if (event.target === $("#notificationCenter")) setOpen(false); });
  $("#notificationCenterList")?.addEventListener("click", handleItemClick);
  $("#markNotificationsRead")?.addEventListener("click", markAllRead);
}

async function refresh() {
  if (!state.user) { state.notifications = []; render(); return; }
  if (state.loading) return;
  state.loading = true;
  const { data, error } = await db.rpc("get_my_notifications", { p_limit: 50 });
  state.loading = false;
  if (error) { console.warn("Không thể tải thông báo.", error); return; }
  state.notifications = Array.isArray(data) ? data : [];
  render();
}

function unreadCount() { return state.notifications.filter((item) => !item.is_read).length; }
function render() {
  const count = unreadCount();
  ["#notificationBadge", "#ordersNotificationBadge"].forEach((selector) => { const badge = $(selector); if (!badge) return; badge.textContent = count > 99 ? "99+" : String(count); badge.hidden = count === 0; });
  const list = $("#notificationCenterList"); const summary = $("#notificationCenterSummary");
  if (!list || !summary) return;
  summary.textContent = count ? `${count} thông báo chưa đọc` : state.notifications.length ? "Bạn đã đọc hết thông báo." : "Chưa có thông báo mới.";
  list.innerHTML = state.notifications.length ? state.notifications.map((item) => `<article class="notification-card ${item.is_read ? "is-read" : "is-unread"}" data-notification-id="${esc(item.id)}" data-notification-source="${esc(item.source)}"><div class="notification-card-icon"><i class="fa-solid ${item.source === "platform" ? "fa-bullhorn" : "fa-box-open"}" aria-hidden="true"></i></div><div class="notification-card-copy"><div class="notification-card-meta"><span>${item.source === "platform" ? "Thông báo cửa hàng" : "Cập nhật đơn hàng"}</span><time>${formatDate(item.created_at)}</time></div><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>${item.cta_url ? `<a href="${esc(item.cta_url)}" class="notification-card-cta">${esc(item.cta_label || "Xem chi tiết")} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>` : ""}</div><span class="notification-unread-dot" aria-label="Chưa đọc"></span></article>`).join("") : '<div class="notification-empty"><i class="fa-regular fa-bell-slash" aria-hidden="true"></i><strong>Không có thông báo</strong><span>Các cập nhật đơn hàng và thông tin cửa hàng sẽ xuất hiện tại đây.</span></div>';
}

async function handleItemClick(event) {
  const card = event.target.closest(".notification-card");
  if (!card || !state.user) return;
  if (event.target.closest("a")) return;
  await markRead(card.dataset.notificationId, card.dataset.notificationSource);
}
async function markRead(id, source) {
  const rpc = source === "platform" ? "mark_platform_notification_read" : "mark_customer_notification_read";
  const { error } = await db.rpc(rpc, { p_notification_id: id });
  if (!error) { const item = state.notifications.find((notice) => notice.id === id); if (item) item.is_read = true; render(); }
}
async function markAllRead() {
  const unread = state.notifications.filter((item) => !item.is_read);
  await Promise.all(unread.map((item) => markRead(item.id, item.source)));
}
function setOpen(open) { const panel = $("#notificationCenter"); if (!panel) return; panel.hidden = !open; panel.setAttribute("aria-hidden", String(!open)); $("#notificationButton")?.setAttribute("aria-expanded", String(open)); if (open) refresh(); }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date); }

export const notificationCenterTestables = { unreadCount, formatDate };
