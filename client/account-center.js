import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { canWriteArticles } from "./role-permissions.js";
import { getAuthRedirectUrl } from "./public-url.js";
import { normalizeDeliveryProfile } from "./account-delivery.js";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = window.nexoraDb || (configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
const $ = (selector, parent = document) => parent.querySelector(selector);
const currency = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));

const state = { user: null, profile: null, wallet: null, ledger: [], topups: [], warnings: [], settings: null, role: null, affiliate: null, commissions: [], orders: [], refunds: [], articles: [], affiliateSettings: null };

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
          <div class="account-head-actions"><a class="account-head-orders" href="/orders.html"><i class="fa-solid fa-truck-fast"></i> Đơn hàng</a><button class="account-head-signout" id="accountSignOutQuick" type="button"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</button></div>
        </div>
        <div class="account-balance-card"><span>SỐ DƯ KHẢ DỤNG</span><strong id="accountBalance">0đ</strong><small id="accountBalanceUpdated">Đang đồng bộ…</small></div>
        <div class="account-tabs" role="tablist">
          <button class="active" data-account-tab="overview" type="button">Tổng quan</button>
          <button data-account-tab="wallet" type="button">Nạp tiền</button>
          <button data-account-tab="affiliate" type="button">Affiliate</button>
          <button data-account-tab="articles" type="button">Bài viết</button>
          <button data-account-tab="security" type="button">Bảo mật</button>
        </div>
        <section class="account-tab active" data-account-panel="overview">
          <form id="accountProfileForm" class="account-form">
            <div class="account-form-head"><h3>Hồ sơ hiển thị</h3><p>Username dùng để nhận diện trong NEXORA; email được quản lý riêng bởi Supabase Auth.</p></div>
            <label>Tên hiển thị<input id="accountDisplayName" maxlength="80" placeholder="Tên của bạn" /></label>
            <label>Username<input id="accountUsername" maxlength="40" placeholder="username" pattern="[a-zA-Z0-9_.-]{3,40}" /><small>3–40 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.</small></label>
            <label>Số điện thoại nhận hàng<input id="accountDeliveryPhone" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" required placeholder="Ví dụ: 0901 234 567" /></label>
            <label>Địa chỉ nhận hàng mặc định<textarea id="accountDeliveryAddress" maxlength="500" autocomplete="street-address" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"></textarea><small>Thông tin này được tự điền khi tạo đơn; bạn có thể điều chỉnh theo từng đơn trong giỏ hàng.</small></label>
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
        <section class="account-tab" data-account-panel="affiliate">
          <div class="account-form-head"><h3>Affiliate &amp; hoa hồng</h3><p id="affiliateAccessCaption">Kiếm hoa hồng khi người mua hoàn tất đơn thông qua link giới thiệu hợp lệ.</p></div>
          <div id="affiliateProfileCard" class="affiliate-profile-card"><p class="account-empty">Đang kiểm tra điều kiện affiliate…</p></div>
          <div class="account-activity"><h3>Hoa hồng gần đây</h3><div id="affiliateCommissionList" class="account-list"><p class="account-empty">Chưa có hoa hồng nào.</p></div></div>
          <div class="account-activity"><h3>Yêu cầu hoàn tiền</h3><form id="refundRequestForm" class="account-form compact"><label>Đơn hàng<select id="refundOrderId"><option value="">Chọn đơn đủ điều kiện</option></select></label><label>Số tiền hoàn (VND)<input id="refundAmount" type="number" min="1" step="1000" required /></label><label>Lý do<textarea id="refundReason" minlength="5" maxlength="600" required placeholder="Mô tả tình trạng cần hỗ trợ hoàn tiền"></textarea></label><button class="button button-quiet" type="submit">Gửi yêu cầu hoàn tiền</button></form><div id="refundRequestList" class="account-list"></div></div>
        </section>
        <section class="account-tab" data-account-panel="articles">
          <div class="account-form-head"><h3>Bài viết cộng đồng</h3><p id="articlePermissionCaption">Chỉ marketing, moderator, admin và affiliate đã được duyệt mới có thể tạo bài viết.</p></div>
          <form id="articleForm" class="account-form article-form"><input id="articleId" type="hidden" /><label>Tiêu đề<input id="articleTitle" maxlength="180" required placeholder="Ví dụ: Chọn laptop cho công việc sáng tạo" /></label><label>Slug URL<input id="articleSlug" pattern="[a-z0-9-]+" maxlength="180" required placeholder="chon-laptop-sang-tao" /></label><label>Tóm tắt<textarea id="articleExcerpt" maxlength="500" placeholder="Mô tả ngắn cho thẻ bài viết"></textarea></label><label>Ảnh bìa (URL)<input id="articleCoverUrl" type="url" maxlength="700" placeholder="https://..." /></label><label>Nội dung<textarea id="articleContent" minlength="40" maxlength="20000" required placeholder="Viết bài chia sẻ tối thiểu 40 ký tự"></textarea></label><div class="article-actions"><button class="button button-quiet" type="submit" data-article-submit="false">Lưu bản nháp</button><button class="button button-primary" type="submit" data-article-submit="true">Gửi duyệt bài</button></div></form><div id="myArticles" class="account-list article-list"></div>
        </section>
        <section class="account-tab" data-account-panel="security">
          <form id="accountEmailForm" class="account-form compact"><div class="account-form-head"><h3>Đổi email</h3><p>Email hiện tại: <strong id="accountCurrentEmail">—</strong></p></div><label>Email mới<input id="accountNewEmail" type="email" autocomplete="email" placeholder="email-moi@example.com" required /></label><button class="button button-quiet" type="submit">Gửi yêu cầu đổi email</button></form>
          <form id="accountPasswordForm" class="account-form compact"><div class="account-form-head"><h3>Đổi mật khẩu</h3><p>Dùng ít nhất 8 ký tự và không sử dụng lại mật khẩu cũ.</p></div><label>Mật khẩu mới<input id="accountNewPassword" type="password" autocomplete="new-password" minlength="8" required /></label><button class="button button-quiet" type="submit">Cập nhật mật khẩu</button></form>
          <div class="account-danger-zone"><h3>Đóng tài khoản</h3><p>Yêu cầu này sẽ khóa mua hàng ngay. Admin chỉ đóng/ẩn danh hóa tài khoản sau khi đơn, số dư và các khoản đối soát đã được xử lý; mật khẩu không bao giờ được hiển thị.</p><button class="button button-quiet" id="requestAccountDeletion" type="button"><i class="fa-solid fa-user-xmark"></i> Yêu cầu đóng tài khoản</button></div>
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
  $("#requestAccountDeletion").addEventListener("click", requestAccountDeletion);
  $("#accountSignOut").addEventListener("click", signOutAccount);
  $("#accountSignOutQuick").addEventListener("click", signOutAccount);
  $("#affiliateProfileCard").addEventListener("click", handleAffiliateAction);
  $("#refundRequestForm").addEventListener("submit", requestRefund);
  $("#refundOrderId").addEventListener("change", syncRefundMaximum);
  $("#articleForm").addEventListener("submit", saveArticle);
  $("#myArticles").addEventListener("click", editArticle);
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
  const [profile, wallet, ledger, topups, warnings, settings, role, affiliate, commissions, orders, refunds, articles, affiliateSettings] = await Promise.all([
    db.from("customer_profiles").select("*").eq("user_id", state.user.id).maybeSingle(),
    db.from("wallet_accounts").select("*").eq("user_id", state.user.id).maybeSingle(),
    db.from("wallet_ledger").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("wallet_topup_requests").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("account_warnings").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("site_settings").select("zalo_phone,zalo_label,public_site_url").eq("singleton", true).maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", state.user.id).maybeSingle(),
    db.from("affiliate_profiles").select("*").eq("user_id", state.user.id).maybeSingle(),
    db.from("affiliate_commissions").select("*").eq("affiliate_user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("orders").select("id,order_number,total_amount,status,fulfillment_status,refund_status,refund_amount,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(20),
    db.from("refund_requests").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(10),
    db.from("articles").select("*").eq("author_id", state.user.id).order("updated_at", { ascending: false }).limit(20),
    db.from("affiliate_program_settings").select("*").eq("singleton", true).maybeSingle(),
  ]);
  state.profile = profile.data; state.wallet = wallet.data; state.ledger = ledger.data || []; state.topups = topups.data || []; state.warnings = warnings.data || []; state.settings = settings.data; state.role = role.data?.role || "customer"; state.affiliate = affiliate.data; state.commissions = commissions.data || []; state.orders = orders.data || []; state.refunds = refunds.data || []; state.articles = articles.data || []; state.affiliateSettings = affiliateSettings.data;
  renderAccount();
}

function renderAccount() {
  const profile = state.profile || {}; const balance = state.wallet?.balance || 0;
  $("#accountDisplayName").value = profile.display_name || ""; $("#accountUsername").value = profile.username || ""; $("#accountDeliveryPhone").value = profile.delivery_phone || ""; $("#accountDeliveryAddress").value = profile.default_shipping_address || ""; $("#accountCurrentEmail").textContent = state.user?.email || "—";
  $("#accountBalance").textContent = currency(balance); $("#accountBalanceUpdated").textContent = `Cập nhật ${dateTime(state.wallet?.updated_at)}`;
  $("#accountStatusCaption").innerHTML = `${escapeHtml(profile.account_status === "active" ? "Tài khoản đang hoạt động. Giao dịch được lưu trong sổ cái." : `Trạng thái tài khoản: ${profile.account_status === "banned" ? "đã khóa" : "tạm ngưng"}. Hãy liên hệ hỗ trợ nếu cần.`)} <span class="account-role-badge">ROLE: ${escapeHtml(state.role)}</span>`;
  $("#accountWarnings").innerHTML = state.warnings.length ? state.warnings.map((item) => `<article class="account-list-item warning"><strong><i class="fa-solid fa-triangle-exclamation"></i> Cảnh cáo</strong><p>${escapeHtml(item.message)}</p><small>${dateTime(item.created_at)}</small></article>`).join("") : '<p class="account-empty">Chưa có cảnh cáo nào.</p>';
  $("#accountTopups").innerHTML = state.topups.length ? state.topups.map((item) => `<article class="account-list-item"><div><strong>${currency(item.amount)}</strong><small>${dateTime(item.created_at)}</small></div><span class="account-status ${escapeHtml(item.status)}">${topupLabel(item.status)}</span>${item.review_note ? `<p>${escapeHtml(item.review_note)}</p>` : ""}</article>`).join("") : '<p class="account-empty">Chưa có yêu cầu nạp.</p>';
  $("#accountLedger").innerHTML = state.ledger.length ? state.ledger.map((item) => `<article class="account-list-item"><div><strong class="${Number(item.amount) > 0 ? "credit" : "debit"}">${Number(item.amount) > 0 ? "+" : ""}${currency(item.amount)}</strong><small>${escapeHtml(ledgerLabel(item.entry_type))} · ${dateTime(item.created_at)}</small></div><span>${currency(item.balance_after)}</span>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}</article>`).join("") : '<p class="account-empty">Chưa có giao dịch số dư.</p>';
  renderAffiliate(); renderRefunds(); renderArticles();
}
function topupLabel(status) { return ({ pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", cancelled: "Đã hủy" })[status] || status; }
function ledgerLabel(type) { return ({ topup: "Nạp tiền", admin_credit: "Cộng bởi admin", admin_debit: "Trừ bởi admin", wallet_payment: "Thanh toán đơn", refund: "Hoàn tiền", affiliate_commission: "Hoa hồng affiliate" })[type] || type; }

function renderAffiliate() { const profile = state.affiliate; const settings = state.affiliateSettings || {}; const hasWriterRole = canWriteArticles(state.role); $("#articlePermissionCaption").textContent = hasWriterRole ? `Role ${state.role} có thể soạn bài. Bài gửi duyệt sẽ chỉ hiển thị sau khi moderator/admin xuất bản.` : "Role hiện tại chưa có quyền tạo bài viết. Hãy được cấp marketing, moderator hoặc affiliate đã duyệt."; $("#articleForm").querySelectorAll("input,textarea,button").forEach((item) => { item.disabled = !hasWriterRole; }); const settingText = `Hoa hồng ${Number(settings.commission_rate || 15)}% cho đơn đã thanh toán và giao thành công. Điều kiện hiện tại: tối thiểu ${Number(settings.min_delivered_orders || 0)} đơn đã giao${settings.requires_approval ? ", cần duyệt" : ""}.`; $("#affiliateAccessCaption").textContent = settingText; if (profile?.status === "approved") { const url = `${window.location.origin}/?ref=${profile.referral_code}`; $("#affiliateProfileCard").innerHTML = `<span class="account-status approved">ĐÃ DUYỆT</span><h4>Link giới thiệu của bạn</h4><code>${escapeHtml(url)}</code><div class="account-inline-actions"><button class="button button-quiet" type="button" data-copy-affiliate="${escapeHtml(url)}"><i class="fa-regular fa-copy"></i> Sao chép link</button><a class="button button-primary" href="/affiliate.html"><i class="fa-solid fa-chart-line"></i> Xem thống kê</a></div>`; } else { const status = profile?.status || "chưa đăng ký"; $("#affiliateProfileCard").innerHTML = `<span class="account-status ${escapeHtml(status === "chưa đăng ký" ? "pending" : status)}">${escapeHtml(status)}</span><p>${escapeHtml(profile?.note || settingText)}</p><button class="button button-primary" type="button" data-request-affiliate ${settings.active === false ? "disabled" : ""}>Đăng ký affiliate</button>`; } $("#affiliateCommissionList").innerHTML = state.commissions.length ? state.commissions.map((item) => `<article class="account-list-item"><div><strong class="credit">+${currency(item.amount)}</strong><small>Đơn ${escapeHtml(item.order_id.slice(0, 8))} · ${dateTime(item.created_at)}</small></div><span class="account-status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></article>`).join("") : '<p class="account-empty">Chưa có hoa hồng nào.</p>'; }
function renderRefunds() { const eligible = state.orders.filter((order) => ["paid", "processing", "completed"].includes(order.status) && !["refunded", "approved"].includes(order.refund_status)); $("#refundOrderId").innerHTML = `<option value="">Chọn đơn đủ điều kiện</option>${eligible.map((order) => `<option value="${escapeHtml(order.id)}" data-total="${Number(order.total_amount)}">${escapeHtml(order.order_number)} · ${currency(order.total_amount)}</option>`).join("")}`; $("#refundRequestList").innerHTML = state.refunds.length ? state.refunds.map((item) => `<article class="account-list-item"><div><strong>${currency(item.amount)}</strong><small>${dateTime(item.created_at)} · ${escapeHtml(item.reason)}</small></div><span class="account-status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></article>`).join("") : '<p class="account-empty">Chưa có yêu cầu hoàn tiền.</p>'; }
function renderArticles() { $("#myArticles").innerHTML = state.articles.length ? state.articles.map((item) => `<article class="account-list-item article-row"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.status)} · Cập nhật ${dateTime(item.updated_at)}</small></div><button class="button button-quiet" type="button" data-edit-article="${escapeHtml(item.id)}">Sửa</button></article>`).join("") : '<p class="account-empty">Bạn chưa có bài viết nào.</p>'; }

async function saveProfile(event) { event.preventDefault(); const delivery = normalizeDeliveryProfile({ phone: $("#accountDeliveryPhone").value, address: $("#accountDeliveryAddress").value }); if (!delivery.valid) return notify(delivery.message, "error"); const button = $("#saveAccountProfile"); setLoading(button, true, "Đang lưu"); const { error } = await db.rpc("update_my_account", { p_display_name: $("#accountDisplayName").value, p_username: $("#accountUsername").value, p_delivery_phone: delivery.phone, p_default_shipping_address: delivery.address }); setLoading(button, false); if (error) return notify(error.message, "error"); notify("Đã cập nhật hồ sơ và địa chỉ nhận hàng.", "success"); loadAccount(); }
async function requestTopup(event) { event.preventDefault(); const amount = Number($("#accountTopupAmount").value); const button = $("#requestTopupButton"); setLoading(button, true, "Đang tạo"); const { data, error } = await db.rpc("request_wallet_topup", { p_amount: amount, p_customer_note: $("#accountTopupNote").value }); setLoading(button, false); if (error) return notify(error.message, "error"); $("#accountTopupForm").reset(); notify("Đã tạo yêu cầu nạp. Vui lòng gửi mã yêu cầu cho shop.", "success"); const phone = String(state.settings?.zalo_phone || "").replace(/\D/g, "").replace(/^0/, "84"); const message = `Xin chào shop, tôi muốn nạp ${currency(amount)} vào số dư NEXORA. Mã yêu cầu: ${data.id}. Email: ${state.user.email}`; if (phone) window.open(`https://zalo.me/${phone}`, "_blank", "noopener"); await loadAccount(); }
async function handleAffiliateAction(event) { const copy = event.target.closest("[data-copy-affiliate]"); if (copy) { try { await navigator.clipboard.writeText(copy.dataset.copyAffiliate); notify("Đã sao chép link affiliate.", "success"); } catch { notify("Không thể sao chép tự động. Hãy sao chép link thủ công.", "error"); } return; } if (!event.target.closest("[data-request-affiliate]")) return; const { error } = await db.rpc("request_affiliate_access"); if (error) return notify(error.message, "error"); notify("Đã gửi yêu cầu affiliate để xét duyệt.", "success"); loadAccount(); }
function syncRefundMaximum() { const option = $("#refundOrderId").selectedOptions[0]; const total = Number(option?.dataset.total || 0); $("#refundAmount").max = String(total || ""); if (total) $("#refundAmount").value = total; }
async function requestRefund(event) { event.preventDefault(); const orderId = $("#refundOrderId").value; if (!orderId) return notify("Hãy chọn đơn hàng cần hỗ trợ.", "error"); const { error } = await db.rpc("request_order_refund", { p_order_id: orderId, p_amount: Number($("#refundAmount").value), p_reason: $("#refundReason").value.trim() }); if (error) return notify(error.message, "error"); event.currentTarget.reset(); notify("Đã gửi yêu cầu hoàn tiền để bộ phận đơn hàng xét duyệt.", "success"); loadAccount(); }
async function saveArticle(event) { event.preventDefault(); const submit = event.submitter?.dataset.articleSubmit === "true"; const { error } = await db.rpc("save_my_article", { p_id: $("#articleId").value || null, p_title: $("#articleTitle").value.trim(), p_slug: $("#articleSlug").value.trim().toLowerCase(), p_excerpt: $("#articleExcerpt").value.trim(), p_content: $("#articleContent").value.trim(), p_cover_image_url: $("#articleCoverUrl").value.trim() || null, p_submit: submit }); if (error) return notify(error.message, "error"); event.currentTarget.reset(); $("#articleId").value = ""; notify(submit ? "Bài viết đã gửi moderator duyệt." : "Đã lưu bản nháp bài viết.", "success"); loadAccount(); }
function editArticle(event) { const button = event.target.closest("[data-edit-article]"); if (!button) return; const article = state.articles.find((item) => item.id === button.dataset.editArticle); if (!article) return; activateTab("articles"); $("#articleId").value = article.id; $("#articleTitle").value = article.title; $("#articleSlug").value = article.slug; $("#articleExcerpt").value = article.excerpt || ""; $("#articleCoverUrl").value = article.cover_image_url || ""; $("#articleContent").value = article.content; }
async function updateEmail(event) { event.preventDefault(); const { error } = await db.auth.updateUser({ email: $("#accountNewEmail").value.trim() }, { emailRedirectTo: getAuthRedirectUrl(state.settings?.public_site_url) }); if (error) return notify(error.message, "error"); $("#accountEmailForm").reset(); notify("Đã gửi yêu cầu đổi email bằng URL production. Hãy làm theo hướng dẫn trong email.", "success"); }
async function updatePassword(event) { event.preventDefault(); const { error } = await db.auth.updateUser({ password: $("#accountNewPassword").value }); if (error) return notify(error.message, "error"); $("#accountPasswordForm").reset(); notify("Đã cập nhật mật khẩu. Hãy đăng nhập lại nếu hệ thống yêu cầu.", "success"); }
async function requestAccountDeletion() { const confirmed = window.confirm("Gửi yêu cầu đóng tài khoản? Tài khoản sẽ bị khóa mua hàng trong khi shop đối soát đơn và số dư còn lại."); if (!confirmed) return; const reason = window.prompt("Lý do (không bắt buộc, tối đa 400 ký tự):") ?? ""; const { error } = await db.rpc("request_my_account_deletion", { p_reason: reason.trim() || null }); if (error) return notify(error.message, "error"); notify("Đã gửi yêu cầu. Tài khoản đã bị khóa giao dịch trong lúc được đối soát.", "success"); await signOutAccount(); }
async function signOutAccount() { const { error } = await db.auth.signOut(); if (error) return notify(error.message, "error"); closeAccountCenter(); notify("Đã đăng xuất.", "success"); }
