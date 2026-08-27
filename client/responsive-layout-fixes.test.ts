import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./responsive-layout-fixes.css", import.meta.url), "utf8");

describe("responsive layout fixes", () => {
  it("giữ menu mobile trong viewport thay vì dùng page frame làm padding ngang", () => {
    expect(css).toContain(".mobile-nav {\n    position: absolute;");
    expect(css).toContain("padding: .7rem 15px 1rem;");
    expect(css).not.toContain("padding: .55rem var(--frame)");
  });

  it("ép Account Center rộng hơn chỉ từ breakpoint desktop", () => {
    expect(css).toContain("@media (min-width: 721px)");
    expect(css).toContain("width: min(1280px, calc(100vw - 48px)) !important;");
  });
});
