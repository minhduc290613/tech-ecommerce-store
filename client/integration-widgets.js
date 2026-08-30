import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("YOUR_"));
let tawkScript;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function getDb() {
  return window.nexoraDb || (configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
}

function currentLanguage() {
  return document.documentElement.lang === "en" || localStorage.getItem("nexora-language") === "en" ? "en" : "vi";
}

function renderWarningBanner(settings = {}) {
  const existing = document.querySelector("#nexoraWarningBanner");
  if (existing) existing.remove();
  if (settings.warning_banner_enabled !== true) return;
  const text = currentLanguage() === "en" ? settings.warning_banner_text_en || settings.warning_banner_text : settings.warning_banner_text || settings.warning_banner_text_en;
  if (!String(text || "").trim()) return;
  const banner = document.createElement("aside");
  banner.id = "nexoraWarningBanner";
  banner.className = `nexora-warning-banner is-${["info", "success", "warning", "danger"].includes(settings.warning_banner_level) ? settings.warning_banner_level : "info"}`;
  if (/^#[0-9a-f]{6}$/i.test(String(settings.warning_banner_color || ""))) banner.style.setProperty("--warning-accent", settings.warning_banner_color);
  banner.setAttribute("role", settings.warning_banner_level === "danger" ? "alert" : "status");
  banner.innerHTML = `<div class="site-frame nexora-warning-inner"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><p>${escapeHtml(text)}</p></div>`;
  document.querySelector(".announcement-bar")?.after(banner);
}

function unloadTawk() {
  if (tawkScript) {
    tawkScript.remove();
    tawkScript = null;
  }
  try {
    delete window.Tawk_API;
    delete window.Tawk_LoadStart;
  } catch {
    // The provider may keep a global reference; a page reload clears it.
  }
}

function loadTawk(settings = {}) {
  unloadTawk();
  const propertyId = String(settings.tawk_property_id || "").trim();
  const widgetId = String(settings.tawk_widget_id || "").trim();
  if (settings.tawk_enabled !== true || !/^[a-zA-Z0-9-]{6,80}$/.test(propertyId) || !/^[a-zA-Z0-9-]{3,80}$/.test(widgetId)) return;
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  tawkScript = document.createElement("script");
  tawkScript.async = true;
  tawkScript.src = `https://embed.tawk.to/${encodeURIComponent(propertyId)}/${encodeURIComponent(widgetId)}`;
  tawkScript.charset = "UTF-8";
  tawkScript.setAttribute("crossorigin", "*" );
  document.head.appendChild(tawkScript);
}

function applySettings(settings) {
  renderWarningBanner(settings);
  loadTawk(settings);
}

async function loadSettings() {
  const db = getDb();
  if (!db) return;
  const { data, error } = await db.from("site_settings").select("tawk_enabled,tawk_property_id,tawk_widget_id,tawk_locale,warning_banner_enabled,warning_banner_text,warning_banner_text_en,warning_banner_level,warning_banner_color").eq("singleton", true).maybeSingle();
  if (!error && data) applySettings(data);
}

window.addEventListener("nexora:settings", event => applySettings(event.detail || {}));
window.addEventListener("nexora:language", () => loadSettings());
loadSettings();
