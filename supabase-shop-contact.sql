-- ============================================================================
-- NEXORA Shop Contact Upgrade
-- Chạy SAU supabase-marketplace-cms.sql.
-- ============================================================================

alter table public.shops
  add column if not exists zalo_phone text,
  add column if not exists zalo_label text not null default 'Liên hệ gian hàng';

comment on column public.shops.zalo_phone is 'Số Zalo riêng của gian hàng, dùng định dạng 84xxxxxxxxx';
