import "./admin-platform-notifications.css";

const $ = (selector, parent = document) => parent.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]);
const state = { db: null, role: "", isAdmin: false, profiles: [], sent: [] };

window.addEventListener("nexora:operator-ready", (event) => {
  const detail = event.detail || {};
  if (!detail.isAdmin && detail.role !== "marketing" && !detail.capabilities?.articles) return;
  init(detail);
});

async function init(detail) {
  if (document.querySelector("#platformNotificationsView") || !window.nexoraAdminDb) return;
  state.db = window.nexoraAdminDb; state.role = detail.role || ""; state.isAdmin = Boolean(detail.isAdmin);
  mount();
  await load();
}

function mount() {
  document.querySelector(".admin-nav")?.insertAdjacentHTML("beforeend", '<button data-view="platform-notifications" type="button"><i class="fa-solid fa-bullhorn"></i><span>Phát thông báo</span></button>');
  document.querySelector(".admin-content")?.insertAdjacentHTML("beforeend", `<section class="admin-view" id="platformNotificationsView" data-admin-view="platform-notifications"><div class="view-toolbar"><div><span class="panel-label">PLATFORM SIGNAL</span><h3>Phát thông báo</h3><p>Admin và MKT có thể gửi thông tin vận hành đến toàn server hoặc một tài khoản cụ thể.</p></div><button class="quiet-button" id="refreshPlatformNotifications" type="button"><i class="fa-solid fa-rotate"></i> Làm mới</button></div><div class="platform-notification-warning"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Không gửi dữ liệu nhạy cảm. Broadcast toàn server sẽ hiển thị cho mọi tài khoản đăng nhập và được lưu trong lịch sử quản trị.</span></div><form class="admin-panel cms-form platform-notification-form" id="platformNotificationForm"><label>Phạm vi gửi<select id="platformNotificationAudience"><option value="all">Toàn server</option><option value="user">Một tài khoản cụ thể</option></select></label><label id="platformNotificationTargetWrap" hidden>Tài khoản nhận<select id="platformNotificationTarget"><option value="">Đang tải tài khoản…</option></select></label><label>Tiêu đề<input id="platformNotificationTitle" maxlength="180" required placeholder="Ví dụ: Lịch bảo trì hệ thống" /></label><label>Nội dung<textarea id="platformNotificationBody" maxlength="2000" rows="5" required placeholder="Nội dung thông báo hiển thị trong trung tâm thông báo."></textarea></label><div class="platform-notification-grid"><label>Nhãn liên kết<input id="platformNotificationCtaLabel" maxlength="80" placeholder="Xem chi tiết (tùy chọn)" /></label><label>URL liên kết<input id="platformNotificationCtaUrl" maxlength="500" placeholder="/orders.html (tùy chọn)" /></label></div><div class="form-actions"><span id="platformNotificationFormStatus">Thông báo chưa được gửi.</span><button class="action-button primary" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Phát thông báo</button></div></form><section class="admin-panel"><div class="panel-top"><div><span class="panel-label">PUBLISH HISTORY</span><h3>Lịch sử phát gần đây</h3><p>Chỉ hiển thị tiêu đề, phạm vi và thời gian; không hiển thị nội dung riêng tư của tài khoản.</p></div></div><div class="table-wrap"><table><thead><tr><th>Phạm vi</th><th>Tiêu đề</th><th>Thời gian</th></tr></thead><tbody id="platformNotificationHistoryBody"></tbody></table></div></section></section>`);
  $("[data-view='platform-notifications']")?.addEventListener("click", activate);
  $("#platformNotificationAudience")?.addEventListener("change", toggleTarget);
  $("#platformNotificationForm")?.addEventListener("submit", publish);
  $("#refreshPlatformNotifications")?.addEventListener("click", load);
}

function activate() { document.querySelectorAll(".admin-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === "platform-notifications")); document.querySelectorAll(".admin-view").forEach((view) => view.classList.toggle("active", view.dataset.adminView === "platform-notifications")); $("#viewTitle").textContent = "Phát thông báo"; }
function toggleTarget() { const userMode = $("#platformNotificationAudience").value === "user"; $("#platformNotificationTargetWrap").hidden = !userMode; }
async function load() {
  const [profiles, sent] = await Promise.all([state.db.from("customer_profiles").select("user_id,display_name,email").order("display_name").limit(200), state.db.rpc("list_platform_notifications", { p_limit: 30 })]);
  state.profiles = profiles.data || []; state.sent = sent.data || [];
  $("#platformNotificationTarget").innerHTML = state.profiles.map((profile) => `<option value="${esc(profile.user_id)}">${esc(profile.display_name || profile.email || profile.user_id.slice(0, 8))} — ${esc(profile.email || "")}</option>`).join("") || '<option value="">Chưa có tài khoản để chọn</option>';
  renderHistory();
}
async function publish(event) {
  event.preventDefault(); const audience = $("#platformNotificationAudience").value; const target = audience === "user" ? $("#platformNotificationTarget").value : null; const title = $("#platformNotificationTitle").value.trim(); const body = $("#platformNotificationBody").value.trim(); const ctaLabel = $("#platformNotificationCtaLabel").value.trim(); const ctaUrl = $("#platformNotificationCtaUrl").value.trim();
  if (audience === "user" && !target) return notify("Hãy chọn tài khoản nhận thông báo.", "error");
  if (audience === "all" && !window.confirm("Broadcast này sẽ hiển thị cho toàn bộ tài khoản. Bạn có chắc muốn phát không?")) return;
  const button = $("#platformNotificationForm button[type=submit]"); button.disabled = true;
  const { error } = await state.db.rpc("publish_platform_notification", { p_audience_type: audience, p_target_user_id: target, p_title: title, p_body: body, p_cta_label: ctaLabel, p_cta_url: ctaUrl }); button.disabled = false;
  if (error) return notify(error.message, "error"); $("#platformNotificationForm").reset(); toggleTarget(); $("#platformNotificationFormStatus").textContent = "Đã phát và lưu lịch sử."; notify("Đã phát thông báo thành công.", "success"); await load();
}
function renderHistory() { const body = $("#platformNotificationHistoryBody"); if (!body) return; body.innerHTML = state.sent.map((item) => `<tr><td>${item.audience_type === "all" ? "Toàn server" : "Tài khoản cụ thể"}</td><td>${esc(item.title)}</td><td>${formatDate(item.created_at)}</td></tr>`).join("") || '<tr><td colspan="3">Chưa có thông báo được phát.</td></tr>'; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date); }
function notify(message, type) { const region = $("#adminToastRegion"); if (!region) return; const item = document.createElement("div"); item.className = `toast ${type}`; item.textContent = message; region.append(item); setTimeout(() => item.remove(), 4200); }
