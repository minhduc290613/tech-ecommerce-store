import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("Tawk, warning banner and international payment settings", () => {
  it("stores the new public integration columns in the canonical schema", () => {
    const sql = read("supabase-unified.sql");
    for (const column of ["tawk_enabled", "tawk_property_id", "tawk_widget_id", "warning_banner_enabled", "warning_banner_text_en", "warning_banner_level", "international_payment_settings"]) {
      expect(sql).toContain(`add column if not exists ${column}`);
    }
  });

  it("loads the widget only when Tawk is explicitly enabled with valid public IDs", () => {
    const source = read("client/integration-widgets.js");
    expect(source).toContain("settings.tawk_enabled !== true");
    expect(source).toContain("embed.tawk.to");
    expect(source).toContain("warning_banner_enabled");
  });

  it("keeps automatic payment processing gated behind server configuration", () => {
    const source = read("client/admin-mantis.js");
    expect(source).toContain("automatic_enabled: false");
    expect(source).toContain("Automatic processing remains locked");
    expect(source).toContain("INTERNATIONAL_PROVIDERS");
  });

  it("exposes the integration panel through the Mantis sidebar", () => {
    const html = read("client/admin-mantis.html");
    expect(html).toContain('data-mantis-view="integrations"');
    expect(html).toContain('id="mantisIntegrationsForm"');
    expect(html).toContain('id="mantisWarningEnabled"');
    expect(html).toContain('id="mantisTawkEnabled"');
    expect(html).toContain('id="mantisPaymentRows"');
  });
});
