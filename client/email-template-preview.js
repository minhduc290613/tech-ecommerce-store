const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));

export function renderPasswordRecoveryEmail(template, senderName = "NEXORA") {
  const safe = {
    subject: escapeHtml(template?.subject || "Đặt lại mật khẩu"),
    preheader: escapeHtml(template?.preheader || ""),
    heading: escapeHtml(template?.heading || "Đặt lại mật khẩu của bạn"),
    body: escapeHtml(template?.body_text || "").replace(/\n/g, "<br />"),
    cta: escapeHtml(template?.cta_label || "Đặt lại mật khẩu"),
    footer: escapeHtml(template?.footer_text || ""),
    sender: escapeHtml(senderName || "NEXORA"),
  };
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe.subject}</title></head><body style="margin:0;background:#edf3f8;font-family:Arial,sans-serif;color:#10233b"><span style="display:none!important;max-height:0;overflow:hidden">${safe.preheader}</span><main style="max-width:620px;margin:32px auto;padding:0 16px"><section style="overflow:hidden;border:1px solid #c9d9e7;background:#ffffff"><header style="padding:24px 28px;background:#0b1829;color:#8ee8ff;font-weight:700;letter-spacing:1px">${safe.sender}</header><div style="padding:32px 28px"><h1 style="margin:0 0 16px;font-size:26px;color:#10233b">${safe.heading}</h1><p style="margin:0 0 24px;color:#42617e;font-size:15px;line-height:1.65">${safe.body}</p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 18px;background:#38bdf8;color:#07121f;text-decoration:none;font-weight:700">${safe.cta}</a><p style="margin:28px 0 0;color:#69839a;font-size:13px;line-height:1.55">${safe.footer}</p></div></section></main></body></html>`;
}

export function getDeliveryRoute(provider) {
  const routes = {
    supabase_smtp: { title: "SMTP trực tiếp trong Supabase", steps: ["Vào Authentication → SMTP Settings.", "Điền host, port, username, password/app password và sender đã xác minh.", "Lưu; không nhập mật khẩu vào Command Deck."] },
    resend_hook: { title: "Resend qua Send Email Hook", steps: ["Tạo API key Resend ở secret manager phía server.", "Deploy Edge Function gửi email bằng key đó; đặt SEND_EMAIL_HOOK_SECRET.", "Vào Authentication → Hooks → Send Email, gắn endpoint/hook secret rồi test."] },
    postmark_hook: { title: "Postmark qua Send Email Hook", steps: ["Tạo server token Postmark ở secret manager phía server.", "Deploy Edge Function gửi email bằng token; đặt SEND_EMAIL_HOOK_SECRET.", "Vào Authentication → Hooks → Send Email, gắn endpoint/hook secret rồi test."] },
    other: { title: "Provider khác", steps: ["Chọn SMTP Settings hoặc Send Email Hook tùy provider.", "Xác minh sender và DNS theo hướng dẫn provider.", "Giữ mọi password/API key ngoài browser và database storefront."] },
  };
  return routes[provider] || routes.other;
}
