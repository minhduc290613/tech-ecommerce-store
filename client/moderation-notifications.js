export function getPendingModerationSummary(reviews = [], comments = []) {
  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const commentCount = Array.isArray(comments) ? comments.length : 0;
  return { reviewCount, commentCount, total: reviewCount + commentCount };
}

export function getModerationNoticeText(summary) {
  if (!summary?.total) return "Không có review hoặc bình luận chờ duyệt.";
  const parts = [];
  if (summary.reviewCount) parts.push(`${summary.reviewCount} đánh giá`);
  if (summary.commentCount) parts.push(`${summary.commentCount} bình luận`);
  return `${parts.join(" và ")} mới cần kiểm duyệt.`;
}

export function isPendingModerationEvent(payload) {
  return ["INSERT", "UPDATE"].includes(payload?.eventType) && payload?.new?.status === "pending";
}
