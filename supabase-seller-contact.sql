-- ============================================================================
-- NEXORA Seller Contact Upgrade
-- Chạy SAU supabase-marketplace-cms.sql.
-- ============================================================================

alter table public.site_settings
  add column if not exists seller_zalo_phone text,
  add column if not exists seller_contact_label text not null default 'Liên hệ người bán',
  add column if not exists seller_contact_message text not null default 'Xin chào, tôi muốn tư vấn về sản phẩm {product_name}.';

comment on column public.site_settings.seller_zalo_phone is 'Số Zalo người bán mặc định, chỉ nhập chữ số mã quốc gia Việt Nam 84xxxxxxxxx';
comment on column public.site_settings.seller_contact_message is 'Mẫu tin tư vấn, hỗ trợ biến {product_name}';
