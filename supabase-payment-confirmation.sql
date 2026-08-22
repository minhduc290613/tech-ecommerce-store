-- ============================================================================
-- NEXORA Payment Confirmation + Zalo
-- Chạy SAU supabase-marketplace-cms.sql và supabase-order-operations.sql.
-- ============================================================================

alter table public.site_settings
  add column if not exists zalo_phone text,
  add column if not exists zalo_confirmation_message text not null default 'Tôi đã chuyển khoản đơn {order_number} với số tiền {total}. Nhờ shop xác nhận giúp tôi.';

alter table public.orders
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmation_note text,
  add column if not exists zalo_confirmation_requested_at timestamptz;

create index if not exists orders_payment_confirmed_at_idx on public.orders(payment_confirmed_at desc nulls last);

comment on column public.site_settings.zalo_phone is 'Số điện thoại Zalo shop, chỉ nhập chữ số mã quốc gia Việt Nam 84xxxxxxxxx';
comment on column public.orders.payment_confirmed_at is 'Thời điểm admin xác nhận đã nhận thanh toán';
comment on column public.orders.zalo_confirmation_requested_at is 'Thời điểm người mua bấm yêu cầu nhắn Zalo xác nhận';
