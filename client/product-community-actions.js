export const COMMENT_ACTION = "comment";

export function getCommunityFocusTarget(action) {
  return action === COMMENT_ACTION ? "#commentBody" : null;
}
