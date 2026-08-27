import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = () => window.nexoraDb || (configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
const $ = (selector, parent = document) => parent.querySelector(selector);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
const dateLabel = (value) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
let activeProduct = null;

document.addEventListener("DOMContentLoaded", initializeCommunityFeatures);

async function initializeCommunityFeatures() {
  mountAdvancedFilter();
  mountCommunityPanel();
  mountJournal();
  mountAffiliateCapture();
  window.addEventListener("nexora:quickview", (event) => { activeProduct = event.detail.product; loadProductCommunity(); });
  window.addEventListener("nexora:settings", (event) => applyStorefrontEffect(event.detail));
  window.addEventListener("nexora:advanced-filter-reset", resetAdvancedFilterInputs);
  await Promise.all([loadJournal(), loadShopHighlights(), loadSettingsEffect()]);
}

function mountAdvancedFilter() {
  const panel = $(".filter-panel");
  if (!panel || $("#advancedSpecFilters")) return;
  panel.insertAdjacentHTML("beforeend", `<details class="advanced-filter" id="advancedSpecFilters"><summary><i class="fa-solid fa-microchip"></i> Lọc theo cấu hình</summary><p>Tìm nhanh theo thông số kỹ thuật có trong catalog.</p><label>CPU / Chip<input data-spec-filter="processor" maxlength="60" placeholder="Ví dụ: Core i7, Snapdragon" /></label><label>RAM<input data-spec-filter="ram" maxlength="40" placeholder="Ví dụ: 16GB" /></label><label>Ổ cứng / Lưu trữ<input data-spec-filter="storage" maxlength="60" placeholder="Ví dụ: 512GB SSD" /></label></details>`);
  panel.querySelectorAll("[data-spec-filter]").forEach((input) => input.addEventListener("input", () => {
    const values = Object.fromEntries([...panel.querySelectorAll("[data-spec-filter]")].map((item) => [item.dataset.specFilter, item.value.trim()]));
    window.dispatchEvent(new CustomEvent("nexora:advanced-filter", { detail: values }));
  }));
}

function resetAdvancedFilterInputs() { document.querySelectorAll("[data-spec-filter]").forEach((input) => { input.value = ""; }); }

function mountCommunityPanel() {
  const quickView = $(".quick-view-content");
  if (!quickView || $("#productCommunityPanel")) return;
  quickView.querySelector(".product-tags")?.insertAdjacentHTML("afterend", `<section class="product-community" id="productCommunityPanel"><div class="community-heading"><span class="panel-label">COMMUNITY SIGNAL</span><strong id="communityRating">Chưa có đánh giá</strong></div><div id="approvedReviewList" class="review-list"><p class="community-empty">Mở một sản phẩm để xem đánh giá.</p></div><form id="reviewForm" class="community-form"><label>Đánh giá của bạn<select id="reviewRating"><option value="5">5 sao — Rất tốt</option><option value="4">4 sao — Tốt</option><option value="3">3 sao — Ổn</option><option value="2">2 sao — Cần cải thiện</option><option value="1">1 sao — Không hài lòng</option></select></label><textarea id="reviewBody" minlength="10" maxlength="2000" placeholder="Chia sẻ trải nghiệm sau khi nhận hàng (tối thiểu 10 ký tự)." required></textarea><button type="submit" class="text-link">Gửi đánh giá chờ duyệt <i class="fa-solid fa-paper-plane"></i></button></form><form id="commentForm" class="community-form compact"><textarea id="commentBody" minlength="2" maxlength="1200" placeholder="Đặt câu hỏi hoặc bình luận về sản phẩm" required></textarea><button type="submit" class="text-link">Gửi bình luận chờ duyệt <i class="fa-solid fa-comment"></i></button></form></section>`);
  $("#reviewForm").addEventListener("submit", submitReview);
  $("#commentForm").addEventListener("submit", submitComment);
}

async function loadProductCommunity() {
  const client = db(); const list = $("#approvedReviewList"); if (!activeProduct || !client || !list) return;
  list.innerHTML = '<p class="community-empty">Đang tải đánh giá...</p>';
  const [reviewsResult, commentsResult] = await Promise.all([
    client.from("product_reviews").select("rating,body,created_at").eq("product_id", activeProduct.id).eq("status", "approved").order("created_at", { ascending: false }).limit(5),
    client.from("product_comments").select("body,created_at").eq("product_id", activeProduct.id).eq("status", "approved").order("created_at", { ascending: false }).limit(5),
  ]);
  const reviews = reviewsResult.data || []; const comments = commentsResult.data || [];
  const average = reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length).toFixed(1) : null;
  $("#communityRating").textContent = average ? `${average}/5 từ ${reviews.length} đánh giá` : "Chưa có đánh giá được duyệt";
  const reviewMarkup = reviews.map((item) => `<article class="review-item"><b>${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}</b><p>${escapeHtml(item.body)}</p><small>${dateLabel(item.created_at)}</small></article>`).join("");
  const commentMarkup = comments.map((item) => `<article class="comment-item"><i class="fa-regular fa-comment"></i><p>${escapeHtml(item.body)}</p><small>${dateLabel(item.created_at)}</small></article>`).join("");
  list.innerHTML = reviewMarkup || commentMarkup ? `${reviewMarkup}${commentMarkup}` : '<p class="community-empty">Chưa có nội dung được duyệt. Bạn có thể là người đầu tiên chia sẻ trải nghiệm.</p>';
}

async function ensureSignedIn() { const session = await db()?.auth.getSession(); if (!session?.data?.session?.user) { window.alert("Hãy đăng nhập trước khi gửi nội dung."); return false; } return true; }
async function submitReview(event) { event.preventDefault(); if (!activeProduct || !(await ensureSignedIn())) return; const result = await db().rpc("submit_product_review", { p_product_id: activeProduct.id, p_rating: Number($("#reviewRating").value), p_body: $("#reviewBody").value.trim() }); if (result.error) return window.alert(result.error.message); event.currentTarget.reset(); window.alert("Đánh giá đã được gửi và chờ moderator duyệt."); }
async function submitComment(event) { event.preventDefault(); if (!activeProduct || !(await ensureSignedIn())) return; const result = await db().rpc("submit_product_comment", { p_product_id: activeProduct.id, p_body: $("#commentBody").value.trim() }); if (result.error) return window.alert(result.error.message); event.currentTarget.reset(); window.alert("Bình luận đã được gửi và chờ moderator duyệt."); }

function mountJournal() {
  const anchor = $("#help"); if (!anchor || $("#journal")) return;
  anchor.insertAdjacentHTML("beforebegin", `<section class="journal-section" id="journal" aria-labelledby="journalTitle"><div class="site-frame"><div class="section-heading compact-heading"><div><span class="section-index">04 / TECH NOTES</span><h2 id="journalTitle">Bài viết<br /><em>đang phát sóng.</em></h2></div><p>Góc nhìn từ marketing, moderator và cộng đồng affiliate đã được kiểm duyệt.</p></div><div class="journal-grid" id="journalGrid"><p class="community-empty">Đang tải bài viết...</p></div></div></section>`);
}

async function loadJournal() { const target = $("#journalGrid"); const client = db(); if (!target || !client) return; const { data, error } = await client.from("articles").select("title,slug,excerpt,cover_image_url,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(6); if (error || !data?.length) { target.innerHTML = '<p class="community-empty">Chưa có bài viết được xuất bản.</p>'; return; } target.innerHTML = data.map((article) => `<a class="journal-card" href="/article.html?slug=${encodeURIComponent(article.slug)}" aria-label="Đọc bài viết ${escapeHtml(article.title)}">${article.cover_image_url ? `<img src="${escapeHtml(article.cover_image_url)}" alt="" loading="lazy" />` : '<div class="journal-card-orbit"><i class="fa-solid fa-satellite-dish"></i></div>'}<div><small>${dateLabel(article.published_at)}</small><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.excerpt || "Bài viết công nghệ từ NEXORA.")}</p><span class="journal-read">Đọc bài viết <i class="fa-solid fa-arrow-right"></i></span></div></a>`).join(""); target.querySelectorAll(".journal-card img").forEach((image) => image.addEventListener("error", () => image.replaceWith(Object.assign(document.createElement("div"), { className: "journal-card-orbit", innerHTML: '<i class="fa-solid fa-image"></i>' })))); }

async function loadShopHighlights() {
  const host = $("#shops"); const client = db(); if (!host || !client || $("#shopHighlights")) return;
  const [{ data: shops }, { data: products }] = await Promise.all([client.from("shops").select("id,name,category").eq("is_active", true), client.from("products").select("id,name,price,image_url,category,is_sale,featured,shop_id").eq("is_active", true)]);
  if (!shops?.length || !products?.length) return;
  const cards = shops.map((shop) => { const item = products.find((product) => product.shop_id === shop.id) || products.find((product) => product.featured && (shop.category === "Công nghệ tuyển chọn" || product.category === shop.category)) || products.find((product) => product.is_sale && product.category === shop.category); if (!item) return ""; return `<article class="shop-highlight-card"><span>${escapeHtml(shop.name)}</span><div><img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" /><p>${escapeHtml(item.name)}</p><strong>${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(item.price)}</strong></div></article>`; }).filter(Boolean).join("");
  if (!cards) return; host.insertAdjacentHTML("afterend", `<section class="shop-highlights-section" id="shopHighlights"><div class="site-frame"><div class="section-heading compact-heading"><div><span class="section-index">03B / SHOP SIGNAL</span><h2>Sản phẩm nổi bật<br /><em>từ từng gian hàng.</em></h2></div><p>Ưu tiên sản phẩm được gắn nổi bật hoặc ưu đãi trong danh mục của gian hàng.</p></div><div class="shop-highlight-grid">${cards}</div></div></section>`);
}

function mountAffiliateCapture() {
  const ref = new URLSearchParams(window.location.search).get("ref"); if (ref && /^[A-Z0-9]{6,18}$/i.test(ref)) localStorage.setItem("nexora-affiliate-ref", ref.toUpperCase());
  const claim = async () => { const code = localStorage.getItem("nexora-affiliate-ref"); const client = db(); if (!code || !client) return; const session = await client.auth.getSession(); if (!session.data.session?.user) return; const { error } = await client.rpc("claim_affiliate_referral", { p_referral_code: code }); if (!error) localStorage.removeItem("nexora-affiliate-ref"); };
  window.addEventListener("nexora:account-open", claim);
  db()?.auth.getSession().then(() => claim());
  db()?.auth.onAuthStateChange((_event, session) => { if (session?.user) claim(); });
}

async function loadSettingsEffect() { const client = db(); if (!client) return; const { data } = await client.from("site_settings").select("storefront_effect,storefront_effect_color,storefront_effect_density").eq("singleton", true).maybeSingle(); if (data) applyStorefrontEffect(data); }
function applyStorefrontEffect(settings) { const old = $("#storefrontEffect"); if (old) old.remove(); const type = settings?.storefront_effect; const density = Math.max(0, Math.min(120, Number(settings?.storefront_effect_density || 0))); if (!type || type === "none" || !density) return; const layer = document.createElement("div"); layer.id = "storefrontEffect"; layer.className = `storefront-effect ${type}`; layer.style.setProperty("--effect-color", settings.storefront_effect_color || "#d8f3ff"); layer.setAttribute("aria-hidden", "true"); layer.innerHTML = Array.from({ length: density }, (_, index) => `<i style="--x:${(index * 37) % 100};--delay:-${(index * 0.73).toFixed(2)}s;--scale:${0.55 + ((index * 13) % 60) / 100}"></i>`).join(""); document.body.append(layer); }
