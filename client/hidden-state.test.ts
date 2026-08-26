import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("hidden state CSS", () => {
  it("giữ thuộc tính hidden ưu tiên hơn display của menu mobile và retry catalog", () => {
    const css = readFileSync(resolve(process.cwd(), "client/style.css"), "utf8");
    expect(css).toContain("[hidden] { display: none !important; }");
  });
});
