import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./account-center.css", import.meta.url), "utf8");

describe("Account Center base layout", () => {
  it("giữ breakpoint mobile riêng để override desktop không tác động giao diện điện thoại", () => {
    expect(css).toContain("@media (max-width: 620px) { .account-center-card { padding: 1.4rem;");
  });
});
