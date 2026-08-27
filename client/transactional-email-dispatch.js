export async function dispatchTransactionalEmail(db, { orderId, eventType }) {
  if (!db || !orderId || !eventType) return { status: "skipped", detail: "Thiếu dữ liệu email giao dịch." };
  const { data } = await db.auth.getSession();
  if (!data.session?.access_token) return { status: "skipped", detail: "Phiên quản trị đã hết hạn." };
  try {
    const response = await fetch("/api/transactional-emails/dispatch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ orderId, eventType }) });
    return await response.json();
  } catch { return { status: "failed", detail: "Không thể liên hệ dịch vụ email." }; }
}
