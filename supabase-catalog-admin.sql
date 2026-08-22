-- ============================================================================
-- NEXORA Catalog Admin Upgrade
-- Chạy SAU supabase-schema.sql và supabase-admin.sql.
-- Mở rộng catalog cho thao tác tạo/chỉnh sửa sản phẩm đầy đủ từ Command Deck.
-- ============================================================================

alter table public.products
  add column if not exists sku text,
  add column if not exists brand text not null default 'NEXORA',
  add column if not exists warranty_months integer not null default 12 check (warranty_months >= 0),
  add column if not exists is_active boolean not null default true;

update public.products
set sku = 'NXR-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where sku is null or trim(sku) = '';

alter table public.products alter column sku set not null;
create unique index if not exists products_sku_unique_idx on public.products(sku);
create index if not exists products_active_idx on public.products(is_active);

-- Khách chỉ xem sản phẩm đang hiển thị; admin vẫn thấy catalog đầy đủ để quản trị.
drop policy if exists "Public can read products" on public.products;
create policy "Public can read active products"
on public.products for select
using (is_active = true or (auth.role() = 'authenticated' and public.is_admin()));

comment on column public.products.sku is 'Mã quản lý sản phẩm hiển thị trong Command Deck';
comment on column public.products.is_active is 'Quyết định sản phẩm có xuất hiện trên storefront hay không';
