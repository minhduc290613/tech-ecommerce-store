import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin order action labels", () => {
  it("hiển thị tên thao tác thay vì chỉ dựa vào icon", () => {
    const source = readFileSync(resolve(process.cwd(), "client/admin.js"), "utf8");
    expect(source).toContain(">Hủy đơn</span>");
    expect(source).toContain(">Xóa lưu trữ</span>");
  });
});
