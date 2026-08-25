import { describe, expect, it } from "vitest";
import { COMMENT_ACTION, getCommunityFocusTarget } from "./product-community-actions.js";

describe("product community action", () => {
  it("đưa CTA bình luận đến đúng ô nhập trong Quick View", () => {
    expect(getCommunityFocusTarget(COMMENT_ACTION)).toBe("#commentBody");
  });

  it("không trả target cộng đồng cho hành động không hỗ trợ", () => {
    expect(getCommunityFocusTarget("quick-view")).toBeNull();
  });
});
