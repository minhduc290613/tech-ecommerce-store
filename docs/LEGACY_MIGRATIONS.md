# Quy ước schema SQL

Repository NEXORA chỉ giữ **một file SQL duy nhất**: [`supabase-unified.sql`](../supabase-unified.sql). File này là nguồn chuẩn cho catalog, CMS, Account Center, role/capability, moderation, affiliate, hoàn tiền, Realtime và toàn bộ RLS/RPC cần thiết.

> Không thêm migration `.sql` rời vào repository. Khi một Supabase production đã có dữ liệu cần nâng cấp, tạo và áp dụng migration DDL có quản lý từ chênh lệch schema canonical sau khi sao lưu và thử ở staging.
