import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = window.nexoraDb || (configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
const $ = (selector, parent = document) => parent.querySelector(selector);
const currency = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));

const state = { user: null, profile: null, wallet: null, ledger: [], topups: [], warnings: [], settings: null };

document.addEventListener("DOMContentLoaded", () => {
  mountAccountCenter();
  window.addEventListener("nexora:account-open", openAccountCenter);
  db?.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    if (!state.user) closeAccountCenter();
  });
});

function mountAccountCenter() {
  if ($("#accountCenterModal")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <section class="modal account-center-modal" id="accountCenterModal" role="dialog" aria-modal="true" aria-labelledby="accountCenterTitle" hidden>
      <div class="modal-card account-center-card">
        <button class="close-button" id="closeAccountCenter" type="button" aria-label="Đóng tài khoản"><i class="fa-solid fa-xmark"></i></button>
        <div class="account-center-head">
          <span class="eyebrow"><span></span> NEXORA ACCOUNT</span>
          <h2 id="accountCenterTitle">Tài khoản &amp;<br /><em>số dư của bạn.</em></h2>
          <p id="accountStatusCaption">Đồng bộ hồ sơ, số dư và lịch sử giao dịch.</p>
        </div>
        <div class="account-balance-card"><span>SỐ DƯ KHẢ DỤNG</span><strong id="accountBalance">0đ</strong><small id="accountBalanceUpdated">Đang đồng bộ…</small></div>
        <div class="account-tabs" role="tablist">
          <button class="active" data-account-tab="overview" type="button">Tổng quan</button>
          <button data-account-tab="wallet" type="button">Nạp tiền</button>
          <button data-account-tab="security" type="button">Bảo mật</button>
        </div>
        <section class="account-tab active" data-account-panel="overview">
          <form id="accountProfileForm" class="account-form">
            <div class="account-form-head"><h3>Hồ sơ hiển thị</h3><p>Username dùng để nhận diện trong NEXORA; email được quản lý riêng bởi Supabase Auth.</p></div>
            <label>Tên hiển thị<input id="accountDisplayName" maxlength="80" placeholder="Tên của bạn" /></label>
            <label>Username<input id="accountUsername" maxlength="40" placeholder="username" pattern="[a-zA-Z0-9_.-]{3,40}" /><small>3–40 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.</small></label>
            <button class="button button-primary" id="saveAccountProfile" type="submit">Lưu hồ sơ <i class="fa-solid fa-check"></i></button>
          </form>
          <div class="account-activity"><h3>Cảnh cáo tài khoản</h3><div id="accountWarnings" class="account-list"><p class="account-empty">Chưa có cảnh cáo nào.</p></div></div>
        </section>
        <section class="account-tab" data-account-panel="wallet">
          <div class="account-form-head"><h3>Nạp số dư qua Zalo</h3><p>Tạo yêu cầu, chuyển khoản theo hướng dẫn của shop và gửi mã yêu cầu qua Zalo. Số dư chỉ tăng sau khi quản trị viên đối soát.</p></div>
          <form id="accountTopupForm" class="account-form compact">
            <label>Số tiền muốn nạp<input id="accountTopupAmount" type="number" inputmode="numeric" min="10000" step="1000" placeholder="Ví dụ: 100000" required /></label>
            <label>Ghi chú cho shop<textarea id="accountTopupNote" maxlength="220" placeholder="Tên người chuyển khoản hoặc thời điểm chuyển tiền"></textarea></label>
            <button class="button button-primary" id="requestTopupButton" type="submit">Tạo yêu cầu &amp; mở Zalo <i class="fa-solid fa-comment-dots"></i></button>
          </form>
          <div class="account-history-grid">
            <div><h3>Yêu cầu nạp gần đây</h3><div id="accountTopups" class="account-list"></div></div>
            <div><h3>Sổ cái số dư</h3><div id="accountLedger" class="account-list"></div></div>
          </div>
        </section>
        <section class="account-tab" data-account-panel="security">
          <form id="accountEmailForm" class="account-form compact"><div class="account-form-head"><h3>Đổi email</h3><p>Email hiện tại: <strong id="accountCurrentEmail">—</strong></p></div><label>Email mới<input id="accountNewEmail" type="email" autocomplete="email" placeholder="email-moi@example.com" required /></label><button class="button button-quiet" type="submit">Gửi yêu cầu đổi email</button></form>
          <form id="accountPasswordForm" class="account-form compact"><div class="account-form-head"><h3>Đổi mật khẩu</h3><p>Dùng ít nhất 8 ký tự và không sử dụng lại mật khẩu cũ.</p></div><label>Mật khẩu mới<input id="accountNewPassword" type="password" autocomplete="new-password" minlength="8" required /></label><button class="button button-quiet" type="submit">Cập nhật mật khẩu</button></form>
          <button class="button account-signout" id="accountSignOut" type="button"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất khỏi thiết bị này</button>
        </section>
      </div>
    </section>`);
  $("#closeAccountCenter").addEventListener("click", closeAccountCenter);
  $("#accountCenterModal").addEventListener("click", (event) => { if (event.target === $("#accountCenterModal")) closeAccountCenter(); });
  $("#accountProfileForm").addEventListener("submit", saveProfile);
  $("#accountTopupForm").addEventListener("submit", requestTopup);
  $("#accountEmailForm").addEventListener("submit", updateEmail);
  $("#accountPasswordForm").addEventListener("submit", updatePassword);
  $("#accountSignOut").addEventListener("click", signOutAccount);
  $$('[data-account-tab]').forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.accountTab)));
}

function $$(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }
function activateTab(tab) { $$('[data-account-tab]').forEach((button) => button.classList.toggle("active", button.dataset.accountTab === tab)); $$('[data-account-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.accountPanel === tab)); }
function closeAccountCenter() { const modal = $("#accountCenterModal"); if (modal) modal.hidden = true; }
function notify(message, type = "info") { const target = $("#toastRegion"); if (!target) return window.alert(message); const item = document.createElement("div"); item.className = `toast ${type}`; item.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}"></i><span>${escapeHtml(message)}</span>`; target.append(item); window.setTimeout(() => item.remove(), 4200); }
function setLoading(button, loading, label) { if (loading) { button.dataset.label = button.innerHTML; button.disabled = true; button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${label}`; } else { button.disabled = false; button.innerHTML = button.dataset.label || button.innerHTML; } }

async function openAccountCenter() {
  if (!db) return notify("Chưa kết nối Supabase.", "error");
  const { data } = await db.auth.getSession(); state.user = data.session?.user || null;
  if (!state.user) return notify("Vui lòng đăng nhập để quản lý tài khoản.", "error");
  $("#accountCenterModal").hidden = false;
  await loadAccount();
}

async function loadAccount() {
  const initial = await db.rpc("ensure_my_account", { p_display_name: null, p_username: null });
  if (initial.error) return notify(initial.error.message, "error");
  const [profile, wallet, ledger, topups, warnings, settings] = await Promise.all([
    db.from("customer_profiles").select("*").eq("user_id", state.user.id).maybeSingle(),
    db.from("wallet_accounts").select("*").eq("user_id", state.user.id).maybeSingle(),
    db.from("wallet_ledger").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("wallet_topup_requests").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("account_warnings").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("site_settings").select("zalo_phone,zalo_label").eq("singleton", true).maybeSingle(),
  ]);
  state.profile = profile.data; state.wallet = wallet.data; state.ledger = ledger.data || []; state.topups = topups.data || []; state.warnings = warnings.data || []; state.settings = settings.data;
  renderAccount();
}

function renderAccount() {
  const profile = state.profile || {}; const balance = state.wallet?.balance || 0;
  $("#accountDisplayName").value = profile.display_name || ""; $("#accountUsername").value = profile.username || ""; $("#accountCurrentEmail").textContent = state.user?.email || "—";
  $("#accountBalance").textContent = currency(balance); $("#accountBalanceUpdated").textContent = `Cập nhật ${dateTime(state.wallet?.updated_at)}`;
  $("#accountStatusCaption").textContent = profile.account_status === "active" ? "Tài khoản đang hoạt động. Giao dịch được lưu trong sổ cái." : `Trạng thái tài khoản: ${profile.account_status === "banned" ? "đã khóa" : "tạm ngưng"}. Hãy liên hệ hỗ trợ nếu cần.`;
  $("#accountWarnings").innerHTML = state.warnings.length ? state.warnings.map((item) => `<article class="account-list-item warning"><strong><i class="fa-solid fa-triangle-exclamation"></i> Cảnh cáo</strong><p>${escapeHtml(item.message)}</p><small>${dateTime(item.created_at)}</small></article>`).join("") : '<p class="account-empty">Chưa có cảnh cáo nào.</p>';
  $("#accountTopups").innerHTML = state.topups.length ? state.topups.map((item) => `<article class="account-list-item"><div><strong>${currency(item.amount)}</strong><small>${dateTime(item.created_at)}</small></div><span class="account-status ${escapeHtml(item.status)}">${topupLabel(item.status)}</span>${item.review_note ? `<p>${escapeHtml(item.review_note)}</p>` : ""}</article>`).join("") : '<p class="account-empty">Chưa có yêu cầu nạp.</p>';
  $("#accountLedger").innerHTML = state.ledger.length ? state.ledger.map((item) => `<article class="account-list-item"><div><strong class="${Number(item.amount) > 0 ? "credit" : "debit"}">${Number(item.amount) > 0 ? "+" : ""}${currency(item.amount)}</strong><small>${escapeHtml(ledgerLabel(item.entry_type))} · ${dateTime(item.created_at)}</small></div><span>${currency(item.balance_after)}</span>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}</article>`).join("") : '<p class="account-empty">Chưa có giao dịch số dư.</p>';
}
function topupLabel(status) { return ({ pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", cancelled: "Đã hủy" })[status] || status; }
function ledgerLabel(type) { return ({ topup: "Nạp tiền", admin_credit: "Cộng bởi admin", admin_debit: "Trừ bởi admin", wallet_payment: "Thanh toán đơn", refund: "Hoàn tiền" })[type] || type; }

async function saveProfile(event) { event.preventDefault(); const button = $("#saveAccountProfile"); setLoading(button, true, "Đang lưu"); const { error } = await db.rpc("update_my_account", { p_display_name: $("#accountDisplayName").value, p_username: $("#accountUsername").value }); setLoading(button, false); if (error) return notify(error.message, "error"); notify("Đã cập nhật hồ sơ.", "success"); loadAccount(); }
async function requestTopup(event) { event.preventDefault(); const amount = Number($("#accountTopupAmount").value); const button = $("#requestTopupButton"); setLoading(button, true, "Đang tạo"); const { data, error } = await db.rpc("request_wallet_topup", { p_amount: amount, p_customer_note: $("#accountTopupNote").value }); setLoading(button, false); if (error) return notify(error.message, "error"); $("#accountTopupForm").reset(); notify("Đã tạo yêu cầu nạp. Vui lòng gửi mã yêu cầu cho shop.", "success"); const phone = String(state.settings?.zalo_phone || "").replace(/\D/g, "").replace(/^0/, "84"); const message = `Xin chào shop, tôi muốn nạp ${currency(amount)} vào số dư NEXORA. Mã yêu cầu: ${data.id}. Email: ${state.user.email}`; if (phone) window.open(`https://zalo.me/${phone}`, "_blank", "noopener"); await loadAccount(); }
async function updateEmail(event) { event.preventDefault(); const { error } = await db.auth.updateUser({ email: $("#accountNewEmail").value.trim() }); if (error) return notify(error.message, "error"); $("#accountEmailForm").reset(); notify("Đã gửi yêu cầu đổi email. Hãy làm theo hướng dẫn của Supabase nếu được yêu cầu.", "success"); }
async function updatePassword(event) { event.preventDefault(); const { error } = await db.auth.updateUser({ password: $("#accountNewPassword").value }); if (error) return notify(error.message, "error"); $("#accountPasswordForm").reset(); notify("Đã cập nhật mật khẩu. Hãy đăng nhập lại nếu hệ thống yêu cầu.", "success"); }
async function signOutAccount() { const { error } = await db.auth.signOut(); if (error) return notify(error.message, "error"); closeAccountCenter(); notify("Đã đăng xuất.", "success"); }
