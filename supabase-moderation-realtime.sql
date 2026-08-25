-- Realtime notification cho Command Deck: chỉ phát thay đổi trên queue review/comment.
-- RLS hiện có vẫn là lớp kiểm soát đọc sự kiện theo role admin/moderator.
alter publication supabase_realtime add table public.product_reviews;
alter publication supabase_realtime add table public.product_comments;
