import type { Express, Request, Response } from "express";
import nodemailer from "nodemailer";

type DeliveryMode = "api" | "smtp" | "disabled";
type QueueItem = { id: string; event_key: string; event_type: string; user_id: string; order_id: string | null; service_request_id: string | null; status: string };
type EmailTemplate = { subject: string; preheader: string; heading: string; body_text: string; cta_label: string; footer_text: string; is_enabled: boolean };
type Order = { order_number: string; total_amount: number | string | null };
type Profile = { email: string | null; display_name: string | null; username: string | null };

const MAX_ERROR_LENGTH = 300;
const EVENT_TYPES = new Set(["paid_cancellation_status", "return_status", "order_delivered"]);

function env(name: string) { return String(process.env[name] || "").trim(); }
function supabaseBaseUrl() { return env("SUPABASE_URL").replace(/\/$/, ""); }
function serviceKey() { return env("SUPABASE_SERVICE_ROLE_KEY"); }

export function getTransactionalEmailSecretStatus() {
  const apiConfigured = Boolean(env("RESEND_API_KEY"));
  const smtpConfigured = Boolean(env("SMTP_HOST") && env("SMTP_PORT") && env("SMTP_USERNAME") && env("SMTP_PASSWORD"));
  const senderConfigured = Boolean(env("EMAIL_FROM_ADDRESS"));
  const databaseConfigured = Boolean(supabaseBaseUrl() && serviceKey());
  return { apiConfigured, smtpConfigured, senderConfigured, databaseConfigured, serverReady: databaseConfigured && senderConfigured && (apiConfigured || smtpConfigured) };
}

function readBearer(req: Request) { const header = req.header("authorization") || ""; return header.startsWith("Bearer ") ? header.slice(7) : ""; }
function supabaseHeaders(token = serviceKey()) { return { apikey: serviceKey(), Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }

async function supabaseJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${supabaseBaseUrl()}${path}`, init);
  if (!response.ok) throw new Error(`Dữ liệu thông báo không khả dụng (${response.status}).`);
  return response.json() as Promise<T>;
}

async function canManageOrders(token: string) {
  if (!token || !supabaseBaseUrl() || !serviceKey()) return false;
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/rpc/can_manage_orders`, { method: "POST", headers: supabaseHeaders(token), body: "{}" });
  return response.ok && Boolean(await response.json());
}

function replaceTokens(text: string, values: Record<string, string>) {
  return String(text || "").replace(/\{(customer_name|order_number|order_total|status|review_note|orders_url|store_name)\}/g, (_match, key: string) => values[key] || "");
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char); }
function toText(value: string) { return value.replace(/<[^>]+>/g, "").replace(/\s{2,}/g, " ").trim(); }

export function renderTransactionalEmail(template: EmailTemplate, values: Record<string, string>) {
  const subject = replaceTokens(template.subject, values);
  const preheader = replaceTokens(template.preheader, values);
  const heading = replaceTokens(template.heading, values);
  const body = replaceTokens(template.body_text, values);
  const cta = replaceTokens(template.cta_label, values);
  const footer = replaceTokens(template.footer_text, values);
  const html = `<!doctype html><html lang="vi"><body style="margin:0;background:#07101c;color:#eaf7ff;font-family:Arial,sans-serif"><span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span><main style="max-width:580px;margin:24px auto;background:#0d1c2d;border:1px solid #25415d;padding:28px"><p style="margin:0;color:#38c6ff;font-size:12px;font-weight:700;letter-spacing:1.2px">NEXORA / ORDER UPDATE</p><h1 style="font-size:24px;line-height:1.25;margin:16px 0;color:#ffffff">${escapeHtml(heading)}</h1><p style="color:#c2d6e8;font-size:15px;line-height:1.7;white-space:pre-line">${escapeHtml(body)}</p><a href="${escapeHtml(values.orders_url)}" style="display:inline-block;margin:12px 0 18px;padding:12px 18px;background:#38c6ff;color:#06111c;text-decoration:none;font-weight:700">${escapeHtml(cta)}</a><p style="margin:0;padding-top:16px;border-top:1px solid #25415d;color:#87a4bc;font-size:12px;line-height:1.6">${escapeHtml(footer)}</p></main></body></html>`;
  return { subject, html, text: toText(`${heading}\n\n${body}\n\n${cta}: ${values.orders_url}\n\n${footer}`) };
}

async function updateQueue(id: string, patch: Record<string, unknown>) {
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/transactional_email_logs?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { ...supabaseHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
  if (!response.ok) throw new Error(`Không thể cập nhật trạng thái email (${response.status}).`);
}

async function sendByApi(payload: { from: string; to: string; subject: string; html: string; text: string; idempotencyKey: string }) {
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": payload.idempotencyKey }, body: JSON.stringify({ from: payload.from, to: [payload.to], subject: payload.subject, html: payload.html, text: payload.text }) });
  if (!response.ok) throw new Error(`Nhà cung cấp email phản hồi ${response.status}.`);
  const result = await response.json() as { id?: string };
  return result.id || null;
}

async function sendBySmtp(payload: { from: string; to: string; subject: string; html: string; text: string }) {
  const transport = nodemailer.createTransport({ host: env("SMTP_HOST"), port: Number(env("SMTP_PORT")), secure: Number(env("SMTP_PORT")) === 465, auth: { user: env("SMTP_USERNAME"), pass: env("SMTP_PASSWORD") } });
  const result = await transport.sendMail({ from: payload.from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
  return result.messageId || null;
}

async function dispatchQueuedEmail(orderId: string, eventType: string): Promise<{ status: string; detail: string }> {
  const [queue, settings, template] = await Promise.all([
    supabaseJson<QueueItem[]>(`/rest/v1/transactional_email_logs?select=id,event_key,event_type,user_id,order_id,service_request_id,status&order_id=eq.${encodeURIComponent(orderId)}&event_type=eq.${encodeURIComponent(eventType)}&status=eq.queued&order=created_at.desc&limit=1`, { headers: supabaseHeaders() }),
    supabaseJson<Array<{ transactional_mode: DeliveryMode; transactional_enabled: boolean; sender_name: string | null; public_site_url: string | null }>>("/rest/v1/email_delivery_settings?select=transactional_mode,transactional_enabled,sender_name,public_site_url&singleton=eq.true&limit=1", { headers: supabaseHeaders() }),
    supabaseJson<EmailTemplate[]>(`/rest/v1/transactional_email_templates?select=subject,preheader,heading,body_text,cta_label,footer_text,is_enabled&event_type=eq.${encodeURIComponent(eventType)}&limit=1`, { headers: supabaseHeaders() }),
  ]);
  const item = queue[0]; const config = settings[0]; const content = template[0];
  if (!item) return { status: "skipped", detail: "Không có email chờ gửi." };
  const status = getTransactionalEmailSecretStatus();
  const mode = config?.transactional_mode || "disabled";
  const channelReady = mode === "api" ? status.apiConfigured : mode === "smtp" ? status.smtpConfigured : false;
  if (!config?.transactional_enabled || !content?.is_enabled || !channelReady || !status.senderConfigured || !status.databaseConfigured) {
    await updateQueue(item.id, { status: "skipped", error_message: "Kênh email chưa đủ cấu hình nên không gửi." });
    return { status: "skipped", detail: "Kênh email chưa đủ cấu hình nên không gửi." };
  }
  const [orders, profiles, serviceRequests] = await Promise.all([
    supabaseJson<Order[]>(`/rest/v1/orders?select=order_number,total_amount&id=eq.${encodeURIComponent(orderId)}&limit=1`, { headers: supabaseHeaders() }),
    supabaseJson<Profile[]>(`/rest/v1/customer_profiles?select=email,display_name,username&user_id=eq.${encodeURIComponent(item.user_id)}&limit=1`, { headers: supabaseHeaders() }),
    item.service_request_id ? supabaseJson<Array<{ status: string; review_note: string | null }>>(`/rest/v1/order_service_requests?select=status,review_note&id=eq.${encodeURIComponent(item.service_request_id)}&limit=1`, { headers: supabaseHeaders() }) : Promise.resolve([]),
  ]);
  const order = orders[0]; const profile = profiles[0];
  if (!order || !profile?.email) throw new Error("Không tìm thấy email người nhận phù hợp.");
  const baseUrl = String(config.public_site_url || "").replace(/\/$/, "");
  const request = serviceRequests[0];
  const statusLabel = request ? ({ approved: "Đã duyệt", completed: "Hoàn tất", rejected: "Từ chối" }[request.status] || request.status) : "Đã giao";
  const values = { customer_name: profile.display_name || profile.username || "bạn", order_number: order.order_number, order_total: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(order.total_amount || 0)), status: statusLabel, review_note: request?.review_note || "", orders_url: `${baseUrl}/orders.html`, store_name: config.sender_name || "NEXORA" };
  const message = renderTransactionalEmail(content, values); const from = env("EMAIL_FROM_ADDRESS");
  try {
    const providerMessageId = mode === "api" ? await sendByApi({ from, to: profile.email, ...message, idempotencyKey: item.event_key }) : await sendBySmtp({ from, to: profile.email, ...message });
    await updateQueue(item.id, { status: "sent", provider_message_id: providerMessageId, sent_at: new Date().toISOString(), error_message: null });
    return { status: "sent", detail: "Email đã được gửi." };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, MAX_ERROR_LENGTH) : "Không thể gửi email.";
    await updateQueue(item.id, { status: "failed", error_message: detail });
    return { status: "failed", detail };
  }
}

export function registerTransactionalEmailRoutes(app: Express) {
  app.get("/api/transactional-emails/status", (_req, res) => res.json(getTransactionalEmailSecretStatus()));
  app.post("/api/transactional-emails/dispatch", async (req: Request, res: Response) => {
    const orderId = String(req.body?.orderId || "").trim(); const eventType = String(req.body?.eventType || "").trim();
    if (!orderId || !EVENT_TYPES.has(eventType)) return res.status(400).json({ status: "invalid", detail: "Yêu cầu gửi email không hợp lệ." });
    if (!(await canManageOrders(readBearer(req)))) return res.status(403).json({ status: "forbidden", detail: "Không có quyền gửi thông báo giao dịch." });
    try { return res.json(await dispatchQueuedEmail(orderId, eventType)); }
    catch (error) { return res.status(503).json({ status: "failed", detail: error instanceof Error ? error.message.slice(0, MAX_ERROR_LENGTH) : "Không thể xử lý email." }); }
  });
}
