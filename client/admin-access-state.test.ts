import { describe, expect, it } from "vitest";
import { getAdminAccessMessage } from "./admin-access-state.js";

describe("admin access messages", () => {
  it("phân biệt phiên hết hạn với tài khoản thiếu quyền", () => {
    expect(getAdminAccessMessage({ sessionError: "Invalid Refresh Token" })).toContain("Phiên đăng nhập cũ");
    expect(getAdminAccessMessage({ allowed: false })).toContain("chưa có quyền");
  });

  it("hiển thị lỗi kiểm tra quyền để admin có thể chẩn đoán", () => {
    expect(getAdminAccessMessage({ authorizationError: "permission denied" })).toContain("permission denied");
  });
});
