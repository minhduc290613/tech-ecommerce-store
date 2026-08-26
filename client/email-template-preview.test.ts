import { describe, expect, it } from "vitest";
import { getDeliveryRoute, renderPasswordRecoveryEmail } from "./email-template-preview.js";

describe("password recovery email preview", () => {
  it("escape nội dung admin nhưng giữ placeholder Supabase xác nhận", () => {
    const html = renderPasswordRecoveryEmail({ subject: "<img>", heading: "Xin <b>", body_text: "Dòng 1\nDòng 2", cta_label: "Mở", footer_text: "<script>" }, "NEXORA");
    expect(html).toContain("&lt;img&gt;");
    expect(html).toContain("{{ .ConfirmationURL }}");
    expect(html).toContain("Dòng 1<br />Dòng 2");
    expect(html).not.toContain("<script>");
  });

  it("nêu checklist riêng cho SMTP trực tiếp và Hook", () => {
    expect(getDeliveryRoute("supabase_smtp").title).toContain("SMTP");
    expect(getDeliveryRoute("resend_hook").steps.join(" ")).toContain("Edge Function");
  });
});
