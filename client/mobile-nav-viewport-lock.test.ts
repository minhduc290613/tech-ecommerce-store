import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./mobile-nav-viewport-lock.css", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

describe("mobile nav viewport lock", () => {
  it("tải bản vá sau cùng và không dùng page frame làm padding cho panel menu", () => {
    expect(html).toContain('href="/mobile-nav-viewport-lock.css"');
    expect(css).toContain(".site-header > .mobile-nav");
    expect(css).toContain("padding: 0 !important;");
    expect(css).toContain("width: auto !important;");
    expect(css).not.toContain("var(--frame)");
  });

  it("khóa chiều ngang viewport và chỉ đặt inset cố định ở phần nội dung menu", () => {
    expect(css).toContain("overflow-x: clip;");
    expect(css).toContain(".mobile-nav-inner");
    expect(css).toContain("padding: 0.7rem 15px 1rem;");
  });
});
