import { describe, expect, it } from "vitest";
import { getModerationNoticeText, getPendingModerationSummary, isPendingModerationEvent } from "./moderation-notifications.js";

describe("moderation notifications", () => {
  it("đếm gộp review và comment pending", () => {
    expect(getPendingModerationSummary([{ id: "r1" }], [{ id: "c1" }, { id: "c2" }])).toEqual({ reviewCount: 1, commentCount: 2, total: 3 });
  });

  it("tạo nội dung thông báo phù hợp khi có queue", () => {
    expect(getModerationNoticeText({ reviewCount: 1, commentCount: 2, total: 3 })).toBe("1 đánh giá và 2 bình luận mới cần kiểm duyệt.");
  });

  it("trả empty state khi queue trống", () => {
    expect(getModerationNoticeText({ reviewCount: 0, commentCount: 0, total: 0 })).toBe("Không có review hoặc bình luận chờ duyệt.");
  });

  it("nhận review upsert UPDATE khi trạng thái quay về pending", () => {
    expect(isPendingModerationEvent({ eventType: "UPDATE", new: { status: "pending" } })).toBe(true);
    expect(isPendingModerationEvent({ eventType: "UPDATE", new: { status: "approved" } })).toBe(false);
  });
});
