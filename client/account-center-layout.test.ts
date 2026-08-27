import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./account-center.css", import.meta.url), "utf8");

describe("Account Center desktop layout", () => {
  it("mở rộng modal chỉ ở breakpoint desktop", () => {
    expect(css).toContain("@media (min-width: 621px) { .account-center-card { width: min(94vw, 1120px)");
    expect(css).toContain("@media (max-width: 620px) { .account-center-card { padding: 1.4rem;");
  });
});
