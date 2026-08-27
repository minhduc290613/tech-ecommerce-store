import crypto from "node:crypto";
import express, { type Express, type Request, type Response } from "express";

export type AutoTransferProvider = "sepay" | "casso" | "vietqr";
export type IncomingTransfer = {
  provider: AutoTransferProvider;
  transactionId: string;
  amount: number;
  orderNumber: string;
  rawReference: string;
};

export function getProviderSecretStatus(provider: string) {
  const selected = provider === "casso" || provider === "vietqr" ? provider : "sepay";
  const baseReady = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const providerReady = selected === "sepay"
    ? Boolean(process.env.SEPAY_WEBHOOK_SECRET)
    : selected === "casso"
      ? Boolean(process.env.CASSO_WEBHOOK_SECURE_TOKEN)
      : Boolean(process.env.VIETQR_PARTNER_USERNAME && process.env.VIETQR_PARTNER_PASSWORD && process.env.JWT_SECRET);
  return { provider: selected, serverReady: baseReady && providerReady, providerSecretConfigured: providerReady };
}

const ORDER_NUMBER_PATTERN = /\b(NXR-\d{8}-[A-Z0-9]{3})\b/i;
const MAX_BODY_BYTES = "1mb";

export function extractOrderNumber(value: unknown): string | null {
  const match = String(value || "").match(ORDER_NUMBER_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

export function parseSePayTransfer(payload: Record<string, unknown>): IncomingTransfer | null {
  const transactionId = String(payload.id || "").trim();
  const amount = Number(payload.transferAmount);
  const rawReference = String(payload.code || payload.content || "");
  const orderNumber = extractOrderNumber(rawReference) || extractOrderNumber(payload.content);
  if (payload.transferType !== "in" || !transactionId || !Number.isFinite(amount) || amount <= 0 || !orderNumber) return null;
  return { provider: "sepay", transactionId, amount, orderNumber, rawReference };
}

export function parseCassoTransfers(payload: Record<string, unknown>): IncomingTransfer[] {
  const rows = Array.isArray(payload.data) ? payload.data : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const data = row as Record<string, unknown>;
    const transactionId = String(data.id || data.tid || "").trim();
    const amount = Number(data.amount);
    const rawReference = String(data.description || "");
    const orderNumber = extractOrderNumber(rawReference);
    if (!transactionId || !Number.isFinite(amount) || amount <= 0 || !orderNumber) return [];
    return [{ provider: "casso" as const, transactionId, amount, orderNumber, rawReference }];
  });
}

export function parseVietQrTransfer(payload: Record<string, unknown>, rawBody: Buffer): IncomingTransfer | null {
  const amount = Number(payload.amount);
  const rawReference = String(payload.content || "");
  const orderNumber = extractOrderNumber(rawReference);
  if (String(payload.transType || "").toUpperCase() !== "C" || !Number.isFinite(amount) || amount <= 0 || !orderNumber) return null;
  const transactionId = crypto.createHash("sha256").update(rawBody).digest("hex");
  return { provider: "vietqr", transactionId, amount, orderNumber, rawReference };
}

export function verifySePaySignature(rawBody: Buffer, timestamp: string | undefined, signature: string | undefined, secret: string, now = Date.now()): boolean {
  const timestampNumber = Number(timestamp);
  if (!secret || !signature || !Number.isSafeInteger(timestampNumber) || Math.abs(Math.floor(now / 1000) - timestampNumber) > 300) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(`${timestampNumber}.${rawBody.toString("utf8")}`).digest("hex")}`;
  const received = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left || ""); const b = Buffer.from(right || "");
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseJsonBody(req: Request): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

function readBearer(req: Request): string {
  const header = req.header("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function verifyVietQrToken(token: string): boolean {
  const key = process.env.JWT_SECRET || "";
  const [expiry, signature] = token.split(".");
  if (!key || !expiry || !signature || Number(expiry) < Date.now()) return false;
  const expected = crypto.createHmac("sha256", key).update(`vietqr:${expiry}`).digest("hex");
  return safeEqual(signature, expected);
}

function createVietQrToken(): { access_token: string; token_type: string; expires_in: number } {
  const expiry = Date.now() + 300_000;
  const key = process.env.JWT_SECRET || "";
  const signature = crypto.createHmac("sha256", key).update(`vietqr:${expiry}`).digest("hex");
  return { access_token: `${expiry}.${signature}`, token_type: "Bearer", expires_in: 300 };
}

function basicCredentials(req: Request): { username: string; password: string } | null {
  const header = req.header("authorization") || "";
  if (!header.startsWith("Basic ")) return null;
  try {
    const [username, password] = Buffer.from(header.slice(6), "base64").toString("utf8").split(":");
    return username && password ? { username, password } : null;
  } catch { return null; }
}

async function reconcileTransfer(transfer: IncomingTransfer): Promise<{ duplicate?: boolean; matched?: boolean }> {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Thiếu cấu hình Supabase server cho webhook thanh toán.");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/process_auto_transfer_webhook`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_provider: transfer.provider, p_transaction_id: transfer.transactionId, p_amount: transfer.amount, p_order_number: transfer.orderNumber, p_reference: transfer.rawReference }),
  });
  if (!response.ok) throw new Error(`Không thể đối soát webhook (${response.status}).`);
  return response.json() as Promise<{ duplicate?: boolean; matched?: boolean }>;
}

function providerFailure(res: Response, message: string, status = 401) { return res.status(status).json({ success: false, message }); }

export function registerPaymentWebhookRoutes(app: Express) {
  const raw = express.raw({ type: "application/json", limit: MAX_BODY_BYTES });

  app.get("/api/payments/auto-transfer/status", (req, res) => {
    // Chỉ trả boolean sức khỏe cấu hình; không có secret, tên biến hay thông tin tài khoản.
    return res.status(200).json(getProviderSecretStatus(String(req.query.provider || "sepay")));
  });

  app.post("/api/payments/webhooks/sepay", raw, async (req, res) => {
    const secret = process.env.SEPAY_WEBHOOK_SECRET || "";
    if (!secret) return providerFailure(res, "SePay chưa được cấu hình.", 503);
    if (!verifySePaySignature(req.body, req.header("x-sepay-timestamp"), req.header("x-sepay-signature"), secret)) return providerFailure(res, "Chữ ký SePay không hợp lệ.");
    const transfer = parseJsonBody(req) && parseSePayTransfer(parseJsonBody(req)!);
    if (!transfer) return res.status(200).json({ success: true });
    try { await reconcileTransfer(transfer); return res.status(200).json({ success: true }); }
    catch { return providerFailure(res, "Chưa thể xử lý giao dịch SePay.", 503); }
  });

  app.post("/api/payments/webhooks/casso", raw, async (req, res) => {
    const token = process.env.CASSO_WEBHOOK_SECURE_TOKEN || "";
    if (!token) return providerFailure(res, "Casso chưa được cấu hình.", 503);
    if (!safeEqual(req.header("secure-token") || "", token)) return providerFailure(res, "Secure token Casso không hợp lệ.");
    const payload = parseJsonBody(req);
    if (!payload) return providerFailure(res, "Payload Casso không hợp lệ.", 400);
    try { await Promise.all(parseCassoTransfers(payload).map(reconcileTransfer)); return res.status(200).json({ success: true }); }
    catch { return providerFailure(res, "Chưa thể xử lý giao dịch Casso.", 503); }
  });

  app.post("/api/token_generate", express.json({ limit: MAX_BODY_BYTES }), (req, res) => {
    const username = process.env.VIETQR_PARTNER_USERNAME || "";
    const password = process.env.VIETQR_PARTNER_PASSWORD || "";
    const credentials = basicCredentials(req);
    if (!username || !password) return providerFailure(res, "VietQR Host2Host chưa được cấu hình.", 503);
    if (!credentials || !safeEqual(credentials.username, username) || !safeEqual(credentials.password, password)) return providerFailure(res, "Xác thực VietQR không hợp lệ.");
    return res.status(200).json(createVietQrToken());
  });

  app.post("/bank/api/transaction-sync", raw, async (req, res) => {
    if (!verifyVietQrToken(readBearer(req))) return providerFailure(res, "Bearer token VietQR không hợp lệ.");
    const payload = parseJsonBody(req);
    const transfer = payload && parseVietQrTransfer(payload, req.body);
    if (!transfer) return res.status(200).json({ error: true, errorReason: "E09", toastMessage: "Không khớp nội dung thanh toán", data: [] });
    try {
      const result = await reconcileTransfer(transfer);
      return res.status(200).json({ error: false, errorReason: "", toastMessage: result.duplicate ? "Giao dịch đã được nhận" : "Đã nhận giao dịch", data: [{ refTransactionId: transfer.transactionId }] });
    } catch {
      return res.status(503).json({ error: true, errorReason: "E05", toastMessage: "Chưa thể xử lý giao dịch", data: [] });
    }
  });
}
