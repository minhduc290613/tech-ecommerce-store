import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { buildAffiliateMetrics } from "./affiliate-dashboard-metrics.js";

const $ = (selector) => document.querySelector(selector);
const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
let shareUrl = "";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  $("#refreshAffiliateDashboard").addEventListener("click", load);
  $("#copyAffiliateLink").addEventListener("click", copyLink);
  if (!db) return showAuthRequired("Chưa thể kết nối dữ liệu affiliate. Hãy kiểm tra cấu hình storefront.");
  const { data } = await db.auth.getSession();
  if (!data.session?.user) return showAuthRequired();
  await load();
}

async function load() {
  $("#affiliateLoading").hidden = false;
  $("#affiliateDashboard").hidden = true;
  $("#affiliatePending").hidden = true;
  const { data, error } = await db.rpc("get_my_affiliate_dashboard");
  $("#affiliateLoading").hidden = true;
  if (error) return toast(error.message || "Không thể tải chỉ số affiliate.", "error");
  if (data?.status !== "approved") return showPending(data?.status);
  render(data);
}

function render(data) {
  const metrics = buildAffiliateMetrics(data);
  shareUrl = `${window.location.origin}/?ref=${encodeURIComponent(data.referral_code)}`;
  $("#affiliateLinkCard strong").textContent = shareUrl;
  $("#copyAffiliateLink").disabled = false;
  $("#affiliateStatus").textContent = "ĐÃ DUYỆT";
  $("#affiliateUpdated").textContent = `Cập nhật ${date(data.generated_at)}`;
  $("#affiliateClicks").textContent = metrics.clicks.toLocaleString("vi-VN");
  $("#affiliateReferrals").textContent = metrics.referrals.toLocaleString("vi-VN");
  $("#affiliateConversion").textContent = `${metrics.conversionRate.toLocaleString("vi-VN")}% chuyển đổi từ click`;
  $("#affiliateSuccessfulOrders").textContent = metrics.successfulOrders.toLocaleString("vi-VN");
  $("#affiliateEarned").textContent = money(metrics.earned);
  $("#affiliateEarnedDetail").textContent = money(metrics.earned);
  $("#affiliatePendingReversal").textContent = money(metrics.pendingReversal);
  $("#affiliateReversed").textContent = money(metrics.reversed);
  $("#affiliateRate").textContent = `${Number(data.program?.commission_rate || 0).toLocaleString("vi-VN")}%`;
  $("#affiliateRequirement").textContent = `${Number(data.program?.min_delivered_orders || 0)} đơn đã giao · ${money(data.program?.min_delivered_amount || 0)}`;
  $("#affiliateProgramStatus").textContent = data.program?.active ? "Đang hoạt động" : "Tạm dừng";
  const commissions = Array.isArray(data.recent_commissions) ? data.recent_commissions : [];
  $("#affiliateCommissionCount").textContent = `${commissions.length} mục gần nhất`;
  $("#affiliateCommissionRows").innerHTML = commissions.length ? commissions.map((item) => `<tr><td><b>${esc(item.order_number)}</b></td><td>${esc(date(item.created_at))}</td><td>${esc(item.rate)}%</td><td><b>${esc(money(item.amount))}</b></td><td><span class="commission-status ${esc(item.status)}">${esc(statusLabel(item.status))}</span></td></tr>`).join("") : '<tr><td colspan="5" class="table-empty">Chưa có hoa hồng nào đủ điều kiện.</td></tr>';
  $("#affiliateDashboard").hidden = false;
}

function statusLabel(status) { return ({ earned: "Đã nhận", pending_reversal: "Chờ hoàn/review", reversed: "Đã hoàn" })[status] || status || "—"; }
function showAuthRequired(message = "Dashboard chỉ hiển thị dữ liệu của tài khoản affiliate đang đăng nhập.") { $("#affiliateLoading").hidden = true; $("#affiliateAuthRequired p").textContent = message; $("#affiliateAuthRequired").hidden = false; }
function showPending(status) { $("#affiliatePending p").textContent = status === "suspended" ? "Quyền affiliate hiện đang tạm dừng. Liên hệ shop nếu bạn cần hỗ trợ." : "Hãy mở Tài khoản trên storefront để đăng ký hoặc xem trạng thái xét duyệt."; $("#affiliatePending").hidden = false; }
async function copyLink() { try { await navigator.clipboard.writeText(shareUrl); toast("Đã sao chép link affiliate.", "success"); } catch { toast("Không thể sao chép tự động. Hãy chọn và sao chép link thủ công.", "error"); } }
function toast(message, type) { const node = document.createElement("div"); node.className = `affiliate-toast-item ${type}`; node.textContent = message; $("#affiliateToast").append(node); setTimeout(() => node.remove(), 4200); }
