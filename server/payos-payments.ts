import express, { type Express, type Request, type Response } from "express";
import crypto from "node:crypto";
import { PayOS } from "@payos/node";

type Order = { id: string; order_number: string; total_amount: number | string; status: string; user_id: string };

type PayOSConfig = { clientId: string; apiKey: string; checksumKey: string };

const MAX_BODY_BYTES = "1mb";
const ORDER_NUMBER_PATTERN = /\b(NXR-\d{8}-[A-Z0-9]{3})\b/i;

export function getPayOSConfig(): PayOSConfig | null {
  const clientId = String(process.env.PAYOS_CLIENT_ID || "").trim();
  const apiKey = String(process.env.PAYOS_API_KEY || "").trim();
  const checksumKey = String(process.env.PAYOS_CHECKSUM_KEY || "").trim();
  return clientId && apiKey && checksumKey ? { clientId, apiKey, checksumKey } : null;
}

export function getPayOSStatus() {
  return { provider: "payos", serverReady: Boolean(getPayOSConfig() && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) };
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function supabaseJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = process.env.SUPABASE_URL || "";
  const response = await fetch(`${url.replace(/\/$/, "")}${path}`, { ...init, headers: { ...supabaseHeaders(), ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return response.json() as Promise<T>;
}

async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authorization = req.header("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id || null;
}

function publicBaseUrl(req: Request): string {
  const configured = String(process.env.PUBLIC_SITE_URL || process.env.PUBLIC_APP_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  const origin = String(req.header("origin") || "").trim();
  if (origin) return origin.replace(/\/$/, "");
  const protocol = req.header("x-forwarded-proto") || req.protocol;
  const host = req.header("x-forwarded-host") || req.header("host");
  return `${protocol}://${host}`.replace(/\/$/, "");
}

function orderCodeFor(orderId: string): number {
  const digest = crypto.createHash("sha256").update(orderId).digest();
  return 100000000 + (digest.readUInt32BE(0) % 899999999);
}

function extractOrderNumber(value: unknown): string | null {
  const match = String(value || "").match(ORDER_NUMBER_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

function payOSClient(config: PayOSConfig) {
  return new PayOS({ clientId: config.clientId, apiKey: config.apiKey, checksumKey: config.checksumKey });
}

function fail(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, message });
}

export function registerPayOSRoutes(app: Express) {
  app.get("/api/payments/payos/status", (_req, res) => res.status(200).json(getPayOSStatus()));

  app.post("/api/payments/payos/create", express.json({ limit: MAX_BODY_BYTES }), async (req, res) => {
    const config = getPayOSConfig();
    if (!config || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(res, "PayOS chưa được cấu hình ở phía server.", 503);
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return fail(res, "Phiên đăng nhập không hợp lệ.", 401);
    const orderId = String(req.body?.orderId || "").trim();
    if (!orderId) return fail(res, "Thiếu mã đơn hàng.");

    try {
      const params = new URLSearchParams({ select: "id,order_number,total_amount,status,user_id", id: `eq.${orderId}`, user_id: `eq.${userId}`, limit: "1" });
      const rows = await supabaseJson<Order[]>(`/rest/v1/orders?${params.toString()}`);
      const order = rows[0];
      if (!order) return fail(res, "Không tìm thấy đơn hàng.", 404);
      if (order.status !== "pending_payment") return fail(res, "Đơn hàng không còn ở trạng thái chờ thanh toán.", 409);

      const amount = Number(order.total_amount);
      const orderCode = orderCodeFor(order.id);
      const baseUrl = publicBaseUrl(req);
      const paymentLink = await payOSClient(config).paymentRequests.create({
        orderCode,
        amount,
        description: `NXR ${order.order_number}`,
        items: [{ name: `NEXORA ${order.order_number}`, quantity: 1, price: amount }],
        cancelUrl: `${baseUrl}/orders.html?payos=cancel&order=${encodeURIComponent(order.order_number)}`,
        returnUrl: `${baseUrl}/orders.html?payos=return&order=${encodeURIComponent(order.order_number)}`,
      });

      const patch = { payment_method: "payos", payment_note: `PayOS ${paymentLink.paymentLinkId || orderCode}`, updated_at: new Date().toISOString() };
      await supabaseJson(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}&user_id=eq.${encodeURIComponent(userId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
      return res.status(200).json({ success: true, checkoutUrl: paymentLink.checkoutUrl, orderCode });
    } catch (error) {
      console.error("PayOS create link failed", error);
      return fail(res, "Không thể tạo liên kết thanh toán PayOS.", 502);
    }
  });

  app.post("/api/payments/payos/webhook", express.json({ limit: MAX_BODY_BYTES }), async (req, res) => {
    const config = getPayOSConfig();
    if (!config || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(res, "PayOS chưa được cấu hình ở phía server.", 503);
    try {
      const verified = await payOSClient(config).webhooks.verify(req.body) as Record<string, any>;
      const data = verified?.data && typeof verified.data === "object" ? verified.data : verified;
      const successful = verified?.success === true || data?.code === "00" || data?.code === 0;
      if (!successful) return res.status(200).json({ success: true, ignored: true });
      const orderNumber = extractOrderNumber(data?.description || verified?.description);
      const amount = Number(data?.amount ?? verified?.amount);
      if (!orderNumber || !Number.isFinite(amount) || amount <= 0) return fail(res, "Webhook PayOS thiếu thông tin đơn hàng hoặc số tiền.");
      const params = new URLSearchParams({ select: "id,order_number,total_amount,status,user_id", order_number: `eq.${orderNumber}`, limit: "1" });
      const rows = await supabaseJson<Order[]>(`/rest/v1/orders?${params.toString()}`);
      const order = rows[0];
      if (!order) return fail(res, "Không tìm thấy đơn hàng PayOS.", 404);
      if (amount !== Number(order.total_amount)) return fail(res, "Số tiền webhook PayOS không khớp đơn hàng.", 409);
      if (["paid", "processing", "completed"].includes(order.status)) return res.status(200).json({ success: true, duplicate: true });
      const reference = String(data?.reference || data?.paymentLinkId || "PayOS").slice(0, 180);
      await supabaseJson(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "paid", payment_method: "payos", payment_confirmed_at: new Date().toISOString(), payment_confirmation_note: `PayOS webhook verified: ${reference}`, updated_at: new Date().toISOString() }) });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("PayOS webhook verification failed", error);
      return fail(res, "Webhook PayOS không hợp lệ hoặc chưa thể xử lý.", 400);
    }
  });
}
