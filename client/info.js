/* Circuit Atelier Information Center — CMS-driven marketplace policy and support pages. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const defaults = {
  about: { title: "Về NEXORA", subtitle: "Nền tảng công nghệ chọn lọc, minh bạch và có trách nhiệm.", content: "NEXORA kết nối người mua với các thiết bị công nghệ có thông tin giá, ưu đãi và tình trạng hàng hóa rõ ràng.\n\nChúng tôi ưu tiên trải nghiệm gọn gàng, các cam kết dễ kiểm tra và hỗ trợ sau đơn qua những kênh công bố trên website." },
  terms: { title: "Điều khoản sử dụng", subtitle: "Các nguyên tắc giúp trải nghiệm mua sắm diễn ra rõ ràng và an toàn.", content: "Khi truy cập hoặc sử dụng NEXORA, bạn đồng ý sử dụng dịch vụ cho mục đích hợp pháp và cung cấp thông tin chính xác khi tạo đơn hàng.\n\nGiá, tồn kho, ưu đãi và thời gian xử lý đơn được hiển thị theo thông tin tại thời điểm đặt hàng. Trong một số trường hợp, NEXORA có thể liên hệ để xác minh đơn, cập nhật tình trạng hàng hoặc làm rõ thông tin giao nhận." },
  privacy: { title: "Chính sách bảo mật", subtitle: "Cam kết xử lý thông tin tài khoản và đơn hàng một cách cẩn trọng.", content: "NEXORA chỉ sử dụng thông tin cần thiết để tạo tài khoản, xử lý đơn hàng, hỗ trợ khách hàng và cải thiện chất lượng phục vụ.\n\nThông tin tài khoản và đơn hàng được bảo vệ bằng cơ chế phân quyền phù hợp. Chúng tôi không công bố thông tin cá nhân của bạn ngoài phạm vi cần thiết để cung cấp dịch vụ hoặc thực hiện nghĩa vụ theo quy định." },
  "shipping-returns": { title: "Giao hàng và đổi trả", subtitle: "Thông tin cần biết trước khi hoàn tất đơn hàng.", content: "Thời gian giao hàng, chi phí vận chuyển và khu vực phục vụ được xác nhận theo từng đơn hàng. Hãy kiểm tra kỹ thông tin liên hệ, địa chỉ và tình trạng sản phẩm trước khi thanh toán.\n\nĐể yêu cầu đổi trả hoặc hỗ trợ bảo hành, vui lòng gửi mã đơn, mô tả tình trạng và hình ảnh liên quan đến kênh hỗ trợ của NEXORA." },
  "seller-guide": { title: "Dành cho gian hàng", subtitle: "Nguyên tắc trình bày sản phẩm và phục vụ người mua.", content: "Gian hàng cần cung cấp thông tin hàng hóa trung thực, bao gồm mô tả, giá, tồn kho, bảo hành và điều kiện giao hàng.\n\nKhông đăng tải nội dung vi phạm pháp luật, xâm phạm quyền sở hữu trí tuệ, gây hiểu nhầm về giá hoặc mô phỏng đánh giá người dùng." },
  contact: { title: "Trung tâm hỗ trợ", subtitle: "Kênh liên hệ và quy trình phản hồi của NEXORA.", content: "Để được hỗ trợ về đơn hàng, sản phẩm hoặc chính sách, hãy liên hệ qua email hiển thị trên website và cung cấp mã đơn nếu có.\n\nNEXORA tiếp nhận yêu cầu trong khung giờ hỗ trợ công bố. Với nội dung cần đối soát thanh toán hoặc xác minh thông tin, thời gian phản hồi có thể phụ thuộc vào dữ liệu kèm theo." },
};

const requested = new URLSearchParams(location.search).get("page");
const slug = defaults[requested] ? requested : "about";
const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));

document.addEventListener("DOMContentLoaded", loadPage);

async function loadPage() {
  let page = defaults[slug]; let settings = null;
  if (db) {
    const [pageResult, settingsResult] = await Promise.all([db.from("site_pages").select("*").eq("slug", slug).maybeSingle(), db.from("site_settings").select("*").eq("singleton", true).maybeSingle()]);
    if (pageResult.data) page = pageResult.data;
    settings = settingsResult.data || null;
  }
  render(page, settings);
}

function render(page, settings) {
  document.title = `${settings?.site_name || "NEXORA"} | ${page.title}`;
  $("#infoTitle").textContent = page.title; $("#infoSubtitle").textContent = page.subtitle;
  $("#infoContent").innerHTML = escapeHtml(page.content).split(/\n\s*\n/).map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`).join("");
  $("#legalNote").hidden = !["terms", "privacy", "shipping-returns"].includes(slug);
  const email = settings?.support_email || "support@nexora.vn";
  $("#supportEmail").textContent = email; $("#supportEmail").href = `mailto:${email}`;
  $$('[data-page-link]').forEach((link) => link.classList.toggle("active", link.dataset.pageLink === slug));
  if (settings?.logo_url) $$('[data-site-logo]').forEach((image) => { image.src = settings.logo_url; });
  $$('[data-site-name]').forEach((element) => { element.textContent = settings?.site_name || "NEXORA"; });
}
