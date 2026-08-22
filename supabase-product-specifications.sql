-- ============================================================================
-- NEXORA Product Technical Specifications + Contact Upgrade
-- Chạy SAU supabase-catalog-admin.sql và supabase-marketplace-cms.sql.
-- ============================================================================

alter table public.products
  add column if not exists technical_specs jsonb not null default '{}'::jsonb;

alter table public.site_settings
  add column if not exists support_phone text,
  add column if not exists zalo_label text not null default 'Nhắn Zalo với NEXORA';

create index if not exists products_technical_specs_gin_idx on public.products using gin(technical_specs);

comment on column public.products.technical_specs is 'Thông số kỹ thuật có cấu trúc: processor, chipset, ram, storage, display, graphics, battery, connectivity, os, ports, extras';
comment on column public.site_settings.support_phone is 'Hotline hiển thị ở chân trang website';
comment on column public.site_settings.zalo_label is 'Nhãn CTA Zalo hiển thị ở chân trang website';
