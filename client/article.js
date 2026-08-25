import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const reader = document.querySelector("#articleReader");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
const formatDate = (value) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value));

async function loadArticle() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return showMissing("Liên kết bài viết không hợp lệ.");
  if (SUPABASE_URL.includes("YOUR_") || SUPABASE_ANON_KEY.includes("YOUR_")) return showMissing("Website chưa kết nối kho bài viết.");
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.from("articles").select("title,excerpt,content,cover_image_url,published_at,slug").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error || !data) return showMissing("Bài viết không tồn tại hoặc chưa được xuất bản.");
  document.title = `${data.title} | NEXORA`;
  const paragraphs = data.content.split(/\n\s*\n/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`).join("");
  reader.innerHTML = `${data.cover_image_url ? `<img class="article-cover" src="${escapeHtml(data.cover_image_url)}" alt="" />` : ""}<header class="article-heading"><span class="article-eyebrow">TECH NOTES / PUBLISHED</span><h1>${escapeHtml(data.title)}</h1><p class="article-excerpt">${escapeHtml(data.excerpt || "Góc nhìn công nghệ từ NEXORA.")}</p><time datetime="${escapeHtml(data.published_at)}">Xuất bản ${formatDate(data.published_at)}</time></header><div class="article-body">${paragraphs}</div><aside class="article-disclosure"><i class="fa-solid fa-circle-info"></i><p>Nội dung do tác giả được cấp quyền tạo và được moderator/admin duyệt trước khi hiển thị công khai.</p></aside>`;
}

function showMissing(message) { reader.innerHTML = `<div class="article-missing"><i class="fa-solid fa-satellite-dish"></i><h1>Không tìm thấy bài viết</h1><p>${escapeHtml(message)}</p><a class="button button-primary" href="/#journal">Về mục bài viết</a></div>`; }
loadArticle();
