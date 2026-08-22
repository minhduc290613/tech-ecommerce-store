-- ============================================================================
-- NEXORA Order Operations Upgrade
-- Chạy SAU supabase-schema.sql và supabase-admin.sql.
-- Mở rộng đơn hàng cho dashboard doanh thu, giao nhận và chỉnh sửa vận hành.
-- ============================================================================

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_note text,
  add column if not exists fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'preparing', 'ready_to_ship', 'shipped', 'delivered', 'returned')),
  add column if not exists carrier text,
  add column if not exists tracking_code text,
  add column if not exists admin_note text,
  add column if not exists fulfillment_updated_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Ánh xạ các đơn cũ sang pipeline giao nhận mới mà không làm mất trạng thái thanh toán.
update public.orders
set fulfillment_status = case
  when status = 'completed' then 'delivered'
  when status = 'processing' then 'preparing'
  else 'unfulfilled'
end
where fulfillment_status = 'unfulfilled'
  and status in ('processing', 'completed');

create index if not exists orders_fulfillment_status_idx on public.orders(fulfillment_status, created_at desc);
create index if not exists orders_status_created_at_idx on public.orders(status, created_at desc);
create index if not exists orders_delivered_at_idx on public.orders(delivered_at desc nulls last);

comment on column public.orders.status is 'Trạng thái thanh toán/xử lý thanh toán của đơn';
comment on column public.orders.fulfillment_status is 'Pipeline giao hàng: chưa xử lý, chuẩn bị, sẵn sàng giao, đang giao, đã giao, hoàn hàng';
