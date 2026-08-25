import { describe, expect, it } from "vitest";
import { canAccessCommandDeck, canWriteArticles, capability, isAdminRole } from "./role-permissions.js";

describe("ma trận role NEXORA", () => {
  it("chỉ role vận hành mới mở được Command Deck", () => {
    expect(canAccessCommandDeck("customer")).toBe(false);
    expect(canAccessCommandDeck("affiliate")).toBe(false);
    expect(canAccessCommandDeck("marketing")).toBe(true);
    expect(canAccessCommandDeck("moderator")).toBe(true);
    expect(canAccessCommandDeck("admin")).toBe(true);
  });

  it("giới hạn quyền bài viết và cấu hình site", () => {
    expect(canWriteArticles("affiliate")).toBe(true);
    expect(canWriteArticles("marketing")).toBe(true);
    expect(canWriteArticles("customer")).toBe(false);
    expect(capability("moderator", "moderation")).toBe(true);
    expect(capability("order_manager", "orders")).toBe(true);
    expect(capability("moderator", "siteSettings")).toBe(false);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("moderator")).toBe(false);
  });
});
