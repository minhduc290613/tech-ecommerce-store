-- ============================================================================
-- NEXORA Tech Store — Unified Supabase Schema
-- Phiên bản canonical. Chạy MỘT LẦN cho project Supabase mới hoặc trống.
-- Script này thay thế chuỗi migration rời trước đây.
-- ============================================================================

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- 1. DỮ LIỆU CỐT LÕI: CATALOG, ĐƠN HÀNG, CHI TIẾT ĐƠN
-- --------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  brand text not null default 'NEXORA',
  category text not null check (category in ('Điện thoại', 'Laptop', 'Phụ kiện')),
  description text not null,
  image_url text not null,
  technical_specs jsonb not null default '{}'::jsonb,
  price numeric(12, 0) not null check (price >= 0),
  original_price numeric(12, 0) not null check (original_price >= price),
  stock integer not null default 0 check (stock >= 0),
  warranty_months integer not null default 12 check (warranty_months >= 0),
  is_active boolean not null default true,
  is_sale boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Tài khoản khách và số dư được kiểm soát qua RPC/sổ cái, không chỉnh trực tiếp ở frontend.
create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text,
  email text,
  account_status text not null default 'active' check (account_status in ('active', 'suspended', 'banned')),
  warning_count integer not null default 0 check (warning_count >= 0),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles add column if not exists deletion_requested_at timestamptz;
alter table public.customer_profiles add column if not exists deletion_note text;
alter table public.customer_profiles drop constraint if exists customer_profiles_account_status_check;
alter table public.customer_profiles add constraint customer_profiles_account_status_check check (account_status in ('active', 'suspended', 'banned', 'deletion_requested', 'deactivated'));
create unique index if not exists customer_profiles_username_ci_idx on public.customer_profiles (lower(username)) where username is not null;

create table if not exists public.wallet_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12, 0) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('topup', 'admin_credit', 'admin_debit', 'wallet_payment', 'refund')),
  amount numeric(12, 0) not null check (amount <> 0), balance_after numeric(12, 0) not null check (balance_after >= 0),
  reference_type text, reference_id uuid, note text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.wallet_topup_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12, 0) not null check (amount > 0), customer_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  review_note text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.account_warnings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (length(trim(message)) > 0), created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.account_audit_log (
  id uuid primary key default gen_random_uuid(), target_user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null, action text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text
);

create table if not exists public.sale_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  title text not null,
  description text not null default '',
  badge_text text not null default 'SALE HUNT',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12, 0) not null check (discount_value > 0),
  minimum_order_amount numeric(12, 0) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12, 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  usage_limit integer,
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  is_hunt_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (usage_limit is null or usage_limit > 0),
  check (maximum_discount_amount is null or maximum_discount_amount > 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  subtotal_amount numeric(12, 0) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(12, 0) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12, 0) not null check (total_amount >= 0),
  sale_campaign_id uuid references public.sale_campaigns(id) on delete set null,
  sale_code text,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'processing', 'completed', 'cancelled')),
  payment_method text not null default 'vietqr' check (payment_method in ('vietqr', 'momo', 'zalopay', 'wallet')),
  payment_note text,
  payment_confirmed_at timestamptz,
  payment_confirmation_note text,
  zalo_confirmation_requested_at timestamptz,
  customer_name text,
  customer_phone text,
  shipping_address text,
  shipping_note text,
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled', 'preparing', 'ready_to_ship', 'shipped', 'delivered', 'returned')),
  carrier text,
  tracking_code text,
  admin_note text,
  fulfillment_updated_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount <= subtotal_amount)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_price numeric(12, 0) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 0) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 2. CMS: NHẬN DIỆN, NỘI DUNG, FAQ VÀ GIAN HÀNG
-- --------------------------------------------------------------------------
create table if not exists public.site_settings (
  singleton boolean primary key default true check (singleton),
  site_name text not null default 'NEXORA',
  site_tagline text not null default 'Thiết bị đúng chuẩn. Mức giá đúng thời điểm.',
  announcement_text text not null default 'Freeship toàn quốc cho đơn từ 1.500.000đ',
  support_email text not null default 'support@nexora.vn',
  support_phone text,
  support_hours text not null default 'Thứ 2 — Thứ 7 / 09:00–18:00',
  address_text text not null default 'Việt Nam',
  logo_url text,
  hero_kicker text not null default 'CURATED TECH / 2026',
  hero_title text not null default 'Thiết bị đúng chuẩn.',
  hero_emphasis text not null default 'Mức giá đúng thời điểm.',
  hero_description text not null default 'Chọn nhanh những thiết bị công nghệ đáng đầu tư — được phân loại rõ ràng, ưu đãi minh bạch và sẵn sàng giao đến bạn.',
  hero_image_url text,
  zalo_phone text,
  zalo_label text not null default 'Nhắn Zalo với NEXORA',
  zalo_confirmation_message text not null default 'Tôi đã chuyển khoản đơn {order_number} với số tiền {total}. Nhờ shop xác nhận giúp tôi.',
  seller_zalo_phone text,
  seller_contact_label text not null default 'Liên hệ người bán',
  seller_contact_message text not null default 'Xin chào, tôi muốn tư vấn về sản phẩm {product_name}.',
  updated_at timestamptz not null default now()
);
alter table public.site_settings add column if not exists public_site_url text not null default 'https://nexorashop-gpjdasbm.manus.space';

create table if not exists public.email_delivery_settings (
  singleton boolean primary key default true check (singleton),
  public_site_url text not null default 'https://nexorashop-gpjdasbm.manus.space',
  sender_name text,
  sender_address text,
  provider text not null default 'supabase_smtp' check (provider in ('supabase_smtp', 'resend_hook', 'postmark_hook', 'other')),
  smtp_host text,
  smtp_port integer check (smtp_port is null or smtp_port between 1 and 65535),
  smtp_username text,
  status text not null default 'handoff_required' check (status in ('handoff_required', 'configured_externally')),
  updated_at timestamptz not null default now()
);

create table if not exists public.password_recovery_email_template (
  singleton boolean primary key default true check (singleton),
  subject text not null default 'Đặt lại mật khẩu NEXORA',
  preheader text not null default 'Dùng liên kết an toàn để đặt lại mật khẩu NEXORA của bạn.',
  heading text not null default 'Đặt lại mật khẩu của bạn',
  body_text text not null default 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản NEXORA của bạn. Liên kết chỉ dùng một lần và có thể hết hạn theo cấu hình Supabase Auth.',
  cta_label text not null default 'Đặt lại mật khẩu',
  footer_text text not null default 'Nếu bạn không gửi yêu cầu này, bạn có thể bỏ qua email một cách an toàn.',
  updated_at timestamptz not null default now()
);

create table if not exists public.site_pages (
  slug text primary key check (slug in ('about', 'terms', 'privacy', 'shipping-returns', 'seller-guide', 'contact')),
  title text not null,
  subtitle text not null default '',
  content text not null,
  title_en text,
  subtitle_en text,
  content_en text,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  question_en text,
  answer_en text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  category text not null,
  banner_url text,
  contact_email text,
  zalo_phone text,
  zalo_label text not null default 'Liên hệ gian hàng',
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 3. INDEX VÀ RLS
-- --------------------------------------------------------------------------
create index if not exists products_category_idx on public.products(category);
create index if not exists products_sale_idx on public.products(is_sale);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists products_technical_specs_gin_idx on public.products using gin(technical_specs);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_fulfillment_status_idx on public.orders(fulfillment_status, created_at desc);
create index if not exists orders_status_created_at_idx on public.orders(status, created_at desc);
create index if not exists orders_sale_campaign_idx on public.orders(sale_campaign_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists sale_campaigns_active_dates_idx on public.sale_campaigns(is_active, starts_at, ends_at);
create index if not exists faqs_published_order_idx on public.faqs(is_published, sort_order);
create index if not exists shops_active_category_idx on public.shops(is_active, category);
create index if not exists wallet_ledger_user_created_idx on public.wallet_ledger(user_id, created_at desc);
create index if not exists wallet_topup_requests_status_created_idx on public.wallet_topup_requests(status, created_at desc);
create index if not exists wallet_topup_requests_user_created_idx on public.wallet_topup_requests(user_id, created_at desc);
create index if not exists account_warnings_user_created_idx on public.account_warnings(user_id, created_at desc);

alter table public.products enable row level security;
alter table public.admin_users enable row level security;
alter table public.sale_campaigns enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_pages enable row level security;
alter table public.faqs enable row level security;
alter table public.shops enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.wallet_topup_requests enable row level security;
alter table public.account_warnings enable row level security;
alter table public.account_audit_log enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Users can read own admin status" on public.admin_users;
create policy "Users can read own admin status" on public.admin_users for select to authenticated using (user_id = auth.uid());

drop policy if exists "Public can read products" on public.products;
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products for select using (is_active = true);
drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders" on public.orders for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own pending orders" on public.orders;
create policy "Users can update own pending orders" on public.orders for update to authenticated using (auth.uid() = user_id and status = 'pending_payment') with check (auth.uid() = user_id and status = 'pending_payment');
drop policy if exists "Admins can manage all orders" on public.orders;
create policy "Admins can manage all orders" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
drop policy if exists "Users can create own order items" on public.order_items;
create policy "Users can create own order items" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items" on public.order_items for select to authenticated using (public.is_admin());

drop policy if exists "Public can read active sale campaigns" on public.sale_campaigns;
create policy "Public can read active sale campaigns" on public.sale_campaigns for select using (is_active = true and starts_at <= now() and ends_at >= now());
drop policy if exists "Admins can manage sale campaigns" on public.sale_campaigns;
create policy "Admins can manage sale campaigns" on public.sale_campaigns for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select using (true);
drop policy if exists "Public can read site pages" on public.site_pages;
create policy "Public can read site pages" on public.site_pages for select using (true);
drop policy if exists "Public can read published faqs" on public.faqs;
create policy "Public can read published faqs" on public.faqs for select using (is_published = true);
drop policy if exists "Public can read active shops" on public.shops;
create policy "Public can read active shops" on public.shops for select using (is_active = true);
drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage site pages" on public.site_pages;
create policy "Admins can manage site pages" on public.site_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage faqs" on public.faqs;
create policy "Admins can manage faqs" on public.faqs for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage shops" on public.shops;
create policy "Admins can manage shops" on public.shops for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------------------
-- 4. CHECKOUT: DATABASE LÀ NGUỒN GIÁ, TỒN KHO VÀ GIẢM GIÁ CHUẨN
-- --------------------------------------------------------------------------
create or replace function public.create_order_with_sale(
  p_order_number text, p_payment_method text, p_payment_note text, p_sale_code text, p_items jsonb
)
returns public.orders language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders; v_product public.products; v_campaign public.sale_campaigns; v_item jsonb;
  v_quantity integer; v_subtotal numeric(12,0) := 0; v_discount numeric(12,0) := 0; v_total numeric(12,0) := 0;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để tạo đơn hàng.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Giỏ hàng không có sản phẩm hợp lệ.'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid and is_active = true;
    if not found then raise exception 'Không tìm thấy hoặc sản phẩm đang ngừng bán.'; end if;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Số lượng sản phẩm không hợp lệ.'; end if;
    if v_product.stock < v_quantity then raise exception 'Sản phẩm % không còn đủ tồn kho.', v_product.name; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;
  if nullif(trim(p_sale_code), '') is not null then
    select * into v_campaign from public.sale_campaigns where code = upper(trim(p_sale_code)) and is_active = true and starts_at <= now() and ends_at >= now() for update;
    if not found then raise exception 'Mã săn sale không hợp lệ hoặc đã hết hạn.'; end if;
    if v_campaign.usage_limit is not null and v_campaign.usage_count >= v_campaign.usage_limit then raise exception 'Mã săn sale đã hết lượt sử dụng.'; end if;
    if v_subtotal < v_campaign.minimum_order_amount then raise exception 'Đơn cần tối thiểu % để áp dụng mã này.', v_campaign.minimum_order_amount; end if;
    v_discount := case when v_campaign.discount_type = 'percent' then floor(v_subtotal * v_campaign.discount_value / 100) else v_campaign.discount_value end;
    if v_campaign.maximum_discount_amount is not null then v_discount := least(v_discount, v_campaign.maximum_discount_amount); end if;
    v_discount := least(v_discount, v_subtotal);
    update public.sale_campaigns set usage_count = usage_count + 1, updated_at = now() where id = v_campaign.id;
  end if;
  v_total := v_subtotal - v_discount;
  insert into public.orders (user_id, order_number, subtotal_amount, discount_amount, total_amount, sale_campaign_id, sale_code, status, payment_method, payment_note)
  values (auth.uid(), p_order_number, v_subtotal, v_discount, v_total, v_campaign.id, nullif(upper(trim(p_sale_code)), ''), 'pending_payment', p_payment_method, p_payment_note) returning * into v_order;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) values (v_order.id, v_product.id, v_product.name, v_product.price, v_quantity, v_product.price * v_quantity);
  end loop;
  return v_order;
end;
$$;
revoke all on function public.create_order_with_sale(text, text, text, text, jsonb) from public;
revoke execute on function public.create_order_with_sale(text, text, text, text, jsonb) from anon;
grant execute on function public.create_order_with_sale(text, text, text, text, jsonb) to authenticated;

create or replace function public.create_order_with_items(p_order_number text, p_payment_method text, p_payment_note text, p_items jsonb)
returns public.orders language sql security invoker set search_path = public
as $$ select public.create_order_with_sale(p_order_number, p_payment_method, p_payment_note, null, p_items); $$;
revoke all on function public.create_order_with_items(text, text, text, jsonb) from public;
revoke execute on function public.create_order_with_items(text, text, text, jsonb) from anon;
grant execute on function public.create_order_with_items(text, text, text, jsonb) to authenticated;

create or replace function public.create_order_with_delivery(
  p_order_number text, p_payment_method text, p_payment_note text, p_sale_code text, p_items jsonb,
  p_customer_name text, p_customer_phone text, p_shipping_address text
)
returns public.orders language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders; v_product public.products; v_campaign public.sale_campaigns; v_item jsonb;
  v_quantity integer; v_subtotal numeric(12,0) := 0; v_discount numeric(12,0) := 0; v_total numeric(12,0) := 0;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để tạo đơn hàng.'; end if;
  if nullif(trim(p_shipping_address), '') is null then raise exception 'Vui lòng nhập địa chỉ nhận hàng.'; end if;
  if length(trim(p_shipping_address)) > 500 then raise exception 'Địa chỉ nhận hàng tối đa 500 ký tự.'; end if;
  if length(coalesce(trim(p_customer_name), '')) > 140 or length(coalesce(trim(p_customer_phone), '')) > 40 then raise exception 'Thông tin người nhận quá dài.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Giỏ hàng không có sản phẩm hợp lệ.'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid and is_active = true;
    if not found then raise exception 'Không tìm thấy hoặc sản phẩm đang ngừng bán.'; end if;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Số lượng sản phẩm không hợp lệ.'; end if;
    if v_product.stock < v_quantity then raise exception 'Sản phẩm % không còn đủ tồn kho.', v_product.name; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;
  if nullif(trim(p_sale_code), '') is not null then
    select * into v_campaign from public.sale_campaigns where code = upper(trim(p_sale_code)) and is_active = true and starts_at <= now() and ends_at >= now() for update;
    if not found then raise exception 'Mã săn sale không hợp lệ hoặc đã hết hạn.'; end if;
    if v_campaign.usage_limit is not null and v_campaign.usage_count >= v_campaign.usage_limit then raise exception 'Mã săn sale đã hết lượt sử dụng.'; end if;
    if v_subtotal < v_campaign.minimum_order_amount then raise exception 'Đơn cần tối thiểu % để áp dụng mã này.', v_campaign.minimum_order_amount; end if;
    v_discount := case when v_campaign.discount_type = 'percent' then floor(v_subtotal * v_campaign.discount_value / 100) else v_campaign.discount_value end;
    if v_campaign.maximum_discount_amount is not null then v_discount := least(v_discount, v_campaign.maximum_discount_amount); end if;
    v_discount := least(v_discount, v_subtotal);
    update public.sale_campaigns set usage_count = usage_count + 1, updated_at = now() where id = v_campaign.id;
  end if;
  v_total := v_subtotal - v_discount;
  insert into public.orders (user_id, order_number, subtotal_amount, discount_amount, total_amount, sale_campaign_id, sale_code, status, payment_method, payment_note, customer_name, customer_phone, shipping_address)
  values (auth.uid(), p_order_number, v_subtotal, v_discount, v_total, v_campaign.id, nullif(upper(trim(p_sale_code)), ''), 'pending_payment', p_payment_method, p_payment_note, nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''), trim(p_shipping_address)) returning * into v_order;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) values (v_order.id, v_product.id, v_product.name, v_product.price, v_quantity, v_product.price * v_quantity);
  end loop;
  return v_order;
end;
$$;
revoke all on function public.create_order_with_delivery(text, text, text, text, jsonb, text, text, text) from public, anon;
grant execute on function public.create_order_with_delivery(text, text, text, text, jsonb, text, text, text) to authenticated;

-- 30. Hồ sơ giao nhận bắt buộc cho tài khoản mới; chỉ dùng trong vận hành đơn hàng theo phân quyền.
alter table public.customer_profiles add column if not exists delivery_phone text;
alter table public.customer_profiles add column if not exists default_shipping_address text;
alter table public.customer_profiles drop constraint if exists customer_profiles_delivery_phone_check;
alter table public.customer_profiles add constraint customer_profiles_delivery_phone_check check (delivery_phone is null or length(trim(delivery_phone)) between 8 and 20);
alter table public.customer_profiles drop constraint if exists customer_profiles_default_shipping_address_check;
alter table public.customer_profiles add constraint customer_profiles_default_shipping_address_check check (default_shipping_address is null or length(trim(default_shipping_address)) between 8 and 500);

create or replace function public.handle_auth_user_created()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
declare v_delivery_phone text := nullif(trim(new.raw_user_meta_data ->> 'delivery_phone'), ''); v_default_shipping_address text := nullif(trim(new.raw_user_meta_data ->> 'default_shipping_address'), '');
begin
  if v_delivery_phone is null or length(v_delivery_phone) not between 8 and 20 then raise exception 'Số điện thoại nhận hàng là bắt buộc.'; end if;
  if v_default_shipping_address is null or length(v_default_shipping_address) not between 8 and 500 then raise exception 'Địa chỉ nhận hàng là bắt buộc.'; end if;
  insert into public.customer_profiles (user_id, email, delivery_phone, default_shipping_address)
  values (new.id, new.email, v_delivery_phone, v_default_shipping_address)
  on conflict (user_id) do update set email = excluded.email, updated_at = now();
  insert into public.wallet_accounts (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict (user_id) do nothing;
  return new;
end;
$$;

drop function if exists public.ensure_my_account(text, text);
create function public.ensure_my_account(p_display_name text default null, p_username text default null, p_delivery_phone text default null, p_default_shipping_address text default null)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status in ('deletion_requested', 'deactivated')) then raise exception 'Tài khoản đang trong quy trình đóng.'; end if;
  insert into public.customer_profiles (user_id, display_name, username, email, delivery_phone, default_shipping_address)
  values (auth.uid(), nullif(trim(p_display_name), ''), nullif(lower(trim(p_username)), ''), auth.jwt() ->> 'email', nullif(trim(p_delivery_phone), ''), nullif(trim(p_default_shipping_address), ''))
  on conflict (user_id) do update set email = excluded.email, delivery_phone = coalesce(excluded.delivery_phone, public.customer_profiles.delivery_phone), default_shipping_address = coalesce(excluded.default_shipping_address, public.customer_profiles.default_shipping_address), updated_at = now() where public.customer_profiles.account_status <> 'deactivated'
  returning * into v_profile;
  insert into public.wallet_accounts (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return v_profile;
end;
$$;

drop function if exists public.update_my_account(text, text);
create function public.update_my_account(p_display_name text, p_username text, p_delivery_phone text, p_default_shipping_address text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles; v_phone text := nullif(trim(p_delivery_phone), ''); v_address text := nullif(trim(p_default_shipping_address), '');
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status <> 'active') then raise exception 'Tài khoản hiện không thể cập nhật hồ sơ.'; end if;
  if v_phone is null or length(v_phone) not between 8 and 20 then raise exception 'Số điện thoại nhận hàng cần từ 8 đến 20 ký tự.'; end if;
  if v_address is null or length(v_address) not between 8 and 500 then raise exception 'Địa chỉ nhận hàng cần từ 8 đến 500 ký tự.'; end if;
  perform public.ensure_my_account(null, null, null, null);
  if p_username is not null and (length(trim(p_username)) < 3 or trim(p_username) !~ '^[a-zA-Z0-9_.-]+$') then raise exception 'Username chỉ gồm 3–40 ký tự chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.'; end if;
  update public.customer_profiles set display_name = nullif(trim(p_display_name), ''), username = nullif(lower(trim(p_username)), ''), delivery_phone = v_phone, default_shipping_address = v_address, email = auth.jwt() ->> 'email', updated_at = now() where user_id = auth.uid() returning * into v_profile;
  return v_profile;
end;
$$;

create or replace function public.create_order_with_delivery(
  p_order_number text, p_payment_method text, p_payment_note text, p_sale_code text, p_items jsonb,
  p_customer_name text, p_customer_phone text, p_shipping_address text
)
returns public.orders language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders; v_product public.products; v_campaign public.sale_campaigns; v_item jsonb;
  v_quantity integer; v_subtotal numeric(12,0) := 0; v_discount numeric(12,0) := 0; v_total numeric(12,0) := 0;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để tạo đơn hàng.'; end if;
  if nullif(trim(p_customer_phone), '') is null then raise exception 'Vui lòng nhập số điện thoại nhận hàng.'; end if;
  if length(trim(p_customer_phone)) not between 8 and 20 then raise exception 'Số điện thoại nhận hàng cần từ 8 đến 20 ký tự.'; end if;
  if nullif(trim(p_shipping_address), '') is null then raise exception 'Vui lòng nhập địa chỉ nhận hàng.'; end if;
  if length(trim(p_shipping_address)) > 500 then raise exception 'Địa chỉ nhận hàng tối đa 500 ký tự.'; end if;
  if length(coalesce(trim(p_customer_name), '')) > 140 then raise exception 'Thông tin người nhận quá dài.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Giỏ hàng không có sản phẩm hợp lệ.'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid and is_active = true;
    if not found then raise exception 'Không tìm thấy hoặc sản phẩm đang ngừng bán.'; end if;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Số lượng sản phẩm không hợp lệ.'; end if;
    if v_product.stock < v_quantity then raise exception 'Sản phẩm % không còn đủ tồn kho.', v_product.name; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;
  if nullif(trim(p_sale_code), '') is not null then
    select * into v_campaign from public.sale_campaigns where code = upper(trim(p_sale_code)) and is_active = true and starts_at <= now() and ends_at >= now() for update;
    if not found then raise exception 'Mã săn sale không hợp lệ hoặc đã hết hạn.'; end if;
    if v_campaign.usage_limit is not null and v_campaign.usage_count >= v_campaign.usage_limit then raise exception 'Mã săn sale đã hết lượt sử dụng.'; end if;
    if v_subtotal < v_campaign.minimum_order_amount then raise exception 'Đơn cần tối thiểu % để áp dụng mã này.', v_campaign.minimum_order_amount; end if;
    v_discount := case when v_campaign.discount_type = 'percent' then floor(v_subtotal * v_campaign.discount_value / 100) else v_campaign.discount_value end;
    if v_campaign.maximum_discount_amount is not null then v_discount := least(v_discount, v_campaign.maximum_discount_amount); end if;
    v_discount := least(v_discount, v_subtotal);
    update public.sale_campaigns set usage_count = usage_count + 1, updated_at = now() where id = v_campaign.id;
  end if;
  v_total := v_subtotal - v_discount;
  insert into public.orders (user_id, order_number, subtotal_amount, discount_amount, total_amount, sale_campaign_id, sale_code, status, payment_method, payment_note, customer_name, customer_phone, shipping_address)
  values (auth.uid(), p_order_number, v_subtotal, v_discount, v_total, v_campaign.id, nullif(upper(trim(p_sale_code)), ''), 'pending_payment', p_payment_method, p_payment_note, nullif(trim(p_customer_name), ''), trim(p_customer_phone), trim(p_shipping_address)) returning * into v_order;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) values (v_order.id, v_product.id, v_product.name, v_product.price, v_quantity, v_product.price * v_quantity);
  end loop;
  return v_order;
end;
$$;

drop policy if exists "Shipment managers can read delivery orders" on public.orders;
create policy "Shipment managers can read delivery orders" on public.orders for select to authenticated using (public.can_manage_shipments());

revoke all on function public.ensure_my_account(text, text, text, text), public.update_my_account(text, text, text, text) from public, anon;
grant execute on function public.ensure_my_account(text, text, text, text), public.update_my_account(text, text, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- 5. ACCOUNT CENTER, SỔ CÁI SỐ DƯ VÀ KIỂM SOÁT TÀI KHOẢN
-- --------------------------------------------------------------------------
create index if not exists account_audit_target_created_idx on public.account_audit_log(target_user_id, created_at desc);

create or replace function public.enforce_active_order_account()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if exists (select 1 from public.customer_profiles where user_id = new.user_id and account_status <> 'active') then
    raise exception 'Tài khoản hiện không thể tạo đơn hàng.';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_active_order_account_trigger on public.orders;
create trigger enforce_active_order_account_trigger before insert on public.orders for each row execute function public.enforce_active_order_account();

alter table public.customer_profiles enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.wallet_topup_requests enable row level security;
alter table public.account_warnings enable row level security;
alter table public.account_audit_log enable row level security;
revoke all on table public.customer_profiles, public.wallet_accounts, public.wallet_ledger, public.wallet_topup_requests, public.account_warnings, public.account_audit_log from anon, authenticated;
grant select on table public.customer_profiles, public.wallet_accounts, public.wallet_ledger, public.wallet_topup_requests, public.account_warnings, public.account_audit_log to authenticated;
alter table public.account_deletion_requests enable row level security;
alter table public.email_delivery_settings enable row level security;
revoke all on table public.account_deletion_requests, public.email_delivery_settings from anon, authenticated;
grant select on table public.account_deletion_requests, public.email_delivery_settings to authenticated;
alter table public.password_recovery_email_template enable row level security;
revoke all on table public.password_recovery_email_template from anon, authenticated;
grant select on table public.password_recovery_email_template to authenticated;

drop policy if exists "Users can read own customer profile" on public.customer_profiles;
create policy "Users can read own customer profile" on public.customer_profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can read customer profiles" on public.customer_profiles;
create policy "Admins can read customer profiles" on public.customer_profiles for select to authenticated using (public.is_admin());
drop policy if exists "Users can read own wallet" on public.wallet_accounts;
create policy "Users can read own wallet" on public.wallet_accounts for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can read wallets" on public.wallet_accounts;
create policy "Admins can read wallets" on public.wallet_accounts for select to authenticated using (public.is_admin());
drop policy if exists "Users can read own wallet ledger" on public.wallet_ledger;
create policy "Users can read own wallet ledger" on public.wallet_ledger for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can read wallet ledger" on public.wallet_ledger;
create policy "Admins can read wallet ledger" on public.wallet_ledger for select to authenticated using (public.is_admin());
drop policy if exists "Users can read own topup requests" on public.wallet_topup_requests;
create policy "Users can read own topup requests" on public.wallet_topup_requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can read topup requests" on public.wallet_topup_requests;
create policy "Admins can read topup requests" on public.wallet_topup_requests for select to authenticated using (public.is_admin());
drop policy if exists "Users can read own warnings" on public.account_warnings;
create policy "Users can read own warnings" on public.account_warnings for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can read warnings" on public.account_warnings;
create policy "Admins can read warnings" on public.account_warnings for select to authenticated using (public.is_admin());
drop policy if exists "Admins can read account audit" on public.account_audit_log;
create policy "Admins can read account audit" on public.account_audit_log for select to authenticated using (public.is_admin());
drop policy if exists "Users can read own deletion request" on public.account_deletion_requests;
create policy "Users can read own deletion request" on public.account_deletion_requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can read deletion requests" on public.account_deletion_requests;
create policy "Admins can read deletion requests" on public.account_deletion_requests for select to authenticated using (public.is_admin());
drop policy if exists "Admins can read email delivery settings" on public.email_delivery_settings;
create policy "Admins can read email delivery settings" on public.email_delivery_settings for select to authenticated using (public.is_admin());
drop policy if exists "Admins can read password recovery email template" on public.password_recovery_email_template;
create policy "Admins can read password recovery email template" on public.password_recovery_email_template for select to authenticated using (public.is_admin());

drop function if exists public.ensure_my_account(text, text);
create or replace function public.ensure_my_account(p_display_name text default null, p_username text default null, p_delivery_phone text default null, p_default_shipping_address text default null)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status in ('deletion_requested', 'deactivated')) then raise exception 'Tài khoản đang trong quy trình đóng.'; end if;
  insert into public.customer_profiles (user_id, display_name, username, email, delivery_phone, default_shipping_address)
  values (auth.uid(), nullif(trim(p_display_name), ''), nullif(lower(trim(p_username)), ''), auth.jwt() ->> 'email', nullif(trim(p_delivery_phone), ''), nullif(trim(p_default_shipping_address), ''))
  on conflict (user_id) do update set email = excluded.email, delivery_phone = coalesce(excluded.delivery_phone, public.customer_profiles.delivery_phone), default_shipping_address = coalesce(excluded.default_shipping_address, public.customer_profiles.default_shipping_address), updated_at = now() where public.customer_profiles.account_status <> 'deactivated' returning * into v_profile;
  insert into public.wallet_accounts (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return v_profile;
end;
$$;

drop function if exists public.update_my_account(text, text);
create or replace function public.update_my_account(p_display_name text, p_username text, p_delivery_phone text, p_default_shipping_address text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles; v_phone text := nullif(trim(p_delivery_phone), ''); v_address text := nullif(trim(p_default_shipping_address), '');
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status <> 'active') then raise exception 'Tài khoản hiện không thể cập nhật hồ sơ.'; end if;
  if v_phone is null or length(v_phone) not between 8 and 20 then raise exception 'Số điện thoại nhận hàng cần từ 8 đến 20 ký tự.'; end if;
  if v_address is null or length(v_address) not between 8 and 500 then raise exception 'Địa chỉ nhận hàng cần từ 8 đến 500 ký tự.'; end if;
  perform public.ensure_my_account(null, null, null, null);
  if p_username is not null and (length(trim(p_username)) < 3 or trim(p_username) !~ '^[a-zA-Z0-9_.-]+$') then raise exception 'Username chỉ gồm 3–40 ký tự chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.'; end if;
  update public.customer_profiles set display_name = nullif(trim(p_display_name), ''), username = nullif(lower(trim(p_username)), ''), delivery_phone = v_phone, default_shipping_address = v_address, email = auth.jwt() ->> 'email', updated_at = now() where user_id = auth.uid() returning * into v_profile;
  return v_profile;
end;
$$;

create or replace function public.request_wallet_topup(p_amount numeric, p_customer_note text default null)
returns public.wallet_topup_requests language plpgsql security definer set search_path = public, auth
as $$
declare v_request public.wallet_topup_requests;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status <> 'active') then raise exception 'Tài khoản hiện không thể tạo yêu cầu nạp.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Số tiền nạp phải lớn hơn 0.'; end if;
  perform public.ensure_my_account(null, null);
  insert into public.wallet_topup_requests (user_id, amount, customer_note) values (auth.uid(), p_amount, nullif(trim(p_customer_note), '')) returning * into v_request;
  return v_request;
end;
$$;

create or replace function public.admin_adjust_wallet(p_user_id uuid, p_amount numeric, p_note text)
returns public.wallet_accounts language plpgsql security definer set search_path = public, auth
as $$
declare v_wallet public.wallet_accounts; v_new_balance numeric(12,0);
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được điều chỉnh số dư.'; end if;
  if p_amount is null or p_amount = 0 or nullif(trim(p_note), '') is null then raise exception 'Cần nhập số tiền khác 0 và lý do điều chỉnh.'; end if;
  insert into public.wallet_accounts (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into v_wallet from public.wallet_accounts where user_id = p_user_id for update;
  v_new_balance := v_wallet.balance + p_amount;
  if v_new_balance < 0 then raise exception 'Số dư không đủ để trừ số tiền này.'; end if;
  update public.wallet_accounts set balance = v_new_balance, updated_at = now() where user_id = p_user_id returning * into v_wallet;
  insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, note, created_by) values (p_user_id, case when p_amount > 0 then 'admin_credit' else 'admin_debit' end, p_amount, v_new_balance, trim(p_note), auth.uid());
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (p_user_id, auth.uid(), 'wallet_adjusted', jsonb_build_object('amount', p_amount, 'note', trim(p_note)));
  return v_wallet;
end;
$$;

create or replace function public.review_wallet_topup(p_request_id uuid, p_decision text, p_note text default null)
returns public.wallet_topup_requests language plpgsql security definer set search_path = public, auth
as $$
declare v_request public.wallet_topup_requests; v_wallet public.wallet_accounts; v_new_balance numeric(12,0);
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được duyệt yêu cầu nạp.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Quyết định không hợp lệ.'; end if;
  select * into v_request from public.wallet_topup_requests where id = p_request_id for update;
  if not found then raise exception 'Không tìm thấy yêu cầu nạp.'; end if;
  if v_request.status <> 'pending' then raise exception 'Yêu cầu này đã được xử lý.'; end if;
  update public.wallet_topup_requests set status = p_decision, review_note = nullif(trim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = p_request_id returning * into v_request;
  if p_decision = 'approved' then
    insert into public.wallet_accounts (user_id) values (v_request.user_id) on conflict (user_id) do nothing;
    select * into v_wallet from public.wallet_accounts where user_id = v_request.user_id for update;
    v_new_balance := v_wallet.balance + v_request.amount;
    update public.wallet_accounts set balance = v_new_balance, updated_at = now() where user_id = v_request.user_id returning * into v_wallet;
    insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, reference_type, reference_id, note, created_by) values (v_request.user_id, 'topup', v_request.amount, v_new_balance, 'topup_request', v_request.id, coalesce(nullif(trim(p_note), ''), 'Nạp tiền được duyệt'), auth.uid());
  end if;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (v_request.user_id, auth.uid(), concat('topup_', p_decision), jsonb_build_object('request_id', v_request.id, 'amount', v_request.amount));
  return v_request;
end;
$$;

create or replace function public.admin_set_account_status(p_user_id uuid, p_status text, p_note text default null)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được đổi trạng thái tài khoản.'; end if;
  if p_status not in ('active', 'suspended', 'banned') then raise exception 'Trạng thái không hợp lệ.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = p_user_id and account_status = 'deactivated') then raise exception 'Tài khoản đã đóng không thể mở lại từ thao tác này.'; end if;
  insert into public.customer_profiles (user_id, email) values (p_user_id, (select email from auth.users where id = p_user_id)) on conflict (user_id) do nothing;
  update public.customer_profiles set account_status = p_status, admin_note = nullif(trim(p_note), ''), updated_at = now() where user_id = p_user_id returning * into v_profile;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (p_user_id, auth.uid(), 'account_status_changed', jsonb_build_object('status', p_status, 'note', p_note));
  return v_profile;
end;
$$;

create or replace function public.request_my_account_deletion(p_reason text default null)
returns public.account_deletion_requests language plpgsql security definer set search_path = public, auth
as $$
declare v_request public.account_deletion_requests;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status = 'deactivated') then raise exception 'Tài khoản đã được đóng.'; end if;
  insert into public.account_deletion_requests (user_id, reason, status, requested_at, reviewed_at, reviewed_by, review_note)
  values (auth.uid(), nullif(trim(p_reason), ''), 'pending', now(), null, null, null)
  on conflict (user_id) do update set reason = excluded.reason, status = 'pending', requested_at = now(), reviewed_at = null, reviewed_by = null, review_note = null
  returning * into v_request;
  update public.customer_profiles set account_status = 'deletion_requested', deletion_requested_at = now(), deletion_note = nullif(trim(p_reason), ''), updated_at = now() where user_id = auth.uid();
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (auth.uid(), auth.uid(), 'account_deletion_requested', jsonb_build_object('has_reason', nullif(trim(p_reason), '') is not null));
  return v_request;
end;
$$;

create or replace function public.admin_close_customer_account(p_user_id uuid, p_note text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles; v_balance numeric(12,0); v_alias text;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được đóng tài khoản.'; end if;
  if p_user_id = auth.uid() then raise exception 'Không thể tự đóng tài khoản quản trị đang đăng nhập.'; end if;
  if nullif(trim(p_note), '') is null then raise exception 'Cần ghi chú đối soát trước khi đóng tài khoản.'; end if;
  select balance into v_balance from public.wallet_accounts where user_id = p_user_id;
  if coalesce(v_balance, 0) <> 0 then raise exception 'Không thể đóng khi số dư chưa về 0.'; end if;
  if exists (select 1 from public.orders where user_id = p_user_id and (status in ('paid', 'processing') or fulfillment_status in ('preparing', 'ready_to_ship', 'shipped'))) then raise exception 'Không thể đóng khi còn đơn đang xử lý/giao nhận.'; end if;
  v_alias := concat('closed-', left(replace(p_user_id::text, '-', ''), 10));
  update public.customer_profiles set account_status = 'deactivated', display_name = 'Tài khoản đã đóng', username = v_alias, email = null, admin_note = trim(p_note), deletion_note = trim(p_note), updated_at = now() where user_id = p_user_id returning * into v_profile;
  update public.account_deletion_requests set status = 'closed', reviewed_at = now(), reviewed_by = auth.uid(), review_note = trim(p_note) where user_id = p_user_id;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (p_user_id, auth.uid(), 'account_closed_anonymized', jsonb_build_object('note', trim(p_note)));
  return v_profile;
end;
$$;

create or replace function public.admin_update_email_delivery_settings(p_public_site_url text, p_sender_name text default null, p_sender_address text default null, p_provider text default 'supabase_smtp', p_smtp_host text default null, p_smtp_port integer default null, p_smtp_username text default null)
returns public.email_delivery_settings language plpgsql security definer set search_path = public, auth
as $$
declare v_settings public.email_delivery_settings; v_url text;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được cập nhật email/domain.'; end if;
  v_url := regexp_replace(trim(coalesce(p_public_site_url, '')), '/+$', '');
  if v_url !~ '^https://[^/[:space:]]+' or v_url ~* '^https://(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::1\\]|[^/]+\\.local|[^/]+\\.manus\\.computer)(/|$)' then raise exception 'URL website phải là HTTPS công khai, không dùng localhost hoặc preview.'; end if;
  if p_provider not in ('supabase_smtp', 'resend_hook', 'postmark_hook', 'other') then raise exception 'Nhà cung cấp email không hợp lệ.'; end if;
  insert into public.email_delivery_settings (singleton, public_site_url, sender_name, sender_address, provider, smtp_host, smtp_port, smtp_username, status, updated_at)
  values (true, v_url, nullif(trim(p_sender_name), ''), nullif(lower(trim(p_sender_address)), ''), p_provider, nullif(trim(p_smtp_host), ''), p_smtp_port, nullif(trim(p_smtp_username), ''), 'handoff_required', now())
  on conflict (singleton) do update set public_site_url = excluded.public_site_url, sender_name = excluded.sender_name, sender_address = excluded.sender_address, provider = excluded.provider, smtp_host = excluded.smtp_host, smtp_port = excluded.smtp_port, smtp_username = excluded.smtp_username, status = 'handoff_required', updated_at = now()
  returning * into v_settings;
  insert into public.site_settings (singleton, public_site_url) values (true, v_url) on conflict (singleton) do update set public_site_url = excluded.public_site_url, updated_at = now();
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (auth.uid(), auth.uid(), 'email_delivery_settings_updated', jsonb_build_object('provider', p_provider, 'public_site_url', v_url, 'has_sender', nullif(trim(p_sender_address), '') is not null));
  return v_settings;
end;
$$;

create or replace function public.admin_update_password_recovery_email_template(p_subject text, p_preheader text, p_heading text, p_body_text text, p_cta_label text, p_footer_text text)
returns public.password_recovery_email_template language plpgsql security definer set search_path = public, auth
as $$
declare v_template public.password_recovery_email_template;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được chỉnh email Quên mật khẩu.'; end if;
  if nullif(trim(p_subject), '') is null or nullif(trim(p_heading), '') is null or nullif(trim(p_body_text), '') is null or nullif(trim(p_cta_label), '') is null then raise exception 'Tiêu đề, heading, nội dung và nhãn nút không được để trống.'; end if;
  if greatest(length(p_subject), length(coalesce(p_preheader, '')), length(p_heading), length(p_body_text), length(p_cta_label), length(coalesce(p_footer_text, ''))) > 4000 then raise exception 'Nội dung email quá dài.'; end if;
  insert into public.password_recovery_email_template (singleton, subject, preheader, heading, body_text, cta_label, footer_text, updated_at)
  values (true, trim(p_subject), trim(coalesce(p_preheader, '')), trim(p_heading), trim(p_body_text), trim(p_cta_label), trim(coalesce(p_footer_text, '')), now())
  on conflict (singleton) do update set subject = excluded.subject, preheader = excluded.preheader, heading = excluded.heading, body_text = excluded.body_text, cta_label = excluded.cta_label, footer_text = excluded.footer_text, updated_at = now()
  returning * into v_template;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (auth.uid(), auth.uid(), 'password_recovery_email_template_updated', jsonb_build_object('subject', v_template.subject));
  return v_template;
end;
$$;

create or replace function public.admin_add_account_warning(p_user_id uuid, p_message text)
returns public.account_warnings language plpgsql security definer set search_path = public, auth
as $$
declare v_warning public.account_warnings;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được gửi cảnh cáo.'; end if;
  if nullif(trim(p_message), '') is null then raise exception 'Nội dung cảnh cáo không được để trống.'; end if;
  insert into public.account_warnings (user_id, message, created_by) values (p_user_id, trim(p_message), auth.uid()) returning * into v_warning;
  update public.customer_profiles set warning_count = warning_count + 1, updated_at = now() where user_id = p_user_id;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (p_user_id, auth.uid(), 'account_warning_added', jsonb_build_object('warning_id', v_warning.id));
  return v_warning;
end;
$$;

create or replace function public.admin_update_account_profile(p_user_id uuid, p_display_name text, p_username text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được chỉnh hồ sơ khách hàng.'; end if;
  if p_username is not null and (length(trim(p_username)) < 3 or trim(p_username) !~ '^[a-zA-Z0-9_.-]+$') then raise exception 'Username chỉ gồm 3–40 ký tự chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.'; end if;
  insert into public.customer_profiles (user_id, email) values (p_user_id, (select email from auth.users where id = p_user_id)) on conflict (user_id) do nothing;
  update public.customer_profiles set display_name = nullif(trim(p_display_name), ''), username = nullif(lower(trim(p_username)), ''), updated_at = now() where user_id = p_user_id returning * into v_profile;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (p_user_id, auth.uid(), 'account_profile_updated', jsonb_build_object('display_name', v_profile.display_name, 'username', v_profile.username));
  return v_profile;
end;
$$;

create or replace function public.pay_order_with_wallet(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_wallet public.wallet_accounts; v_balance numeric(12,0);
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để thanh toán.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status <> 'active') then raise exception 'Tài khoản hiện không thể thanh toán.'; end if;
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if v_order.status <> 'pending_payment' then raise exception 'Đơn hàng này không còn chờ thanh toán.'; end if;
  insert into public.wallet_accounts (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into v_wallet from public.wallet_accounts where user_id = auth.uid() for update;
  if v_wallet.balance < v_order.total_amount then raise exception 'Số dư không đủ. Hãy tạo yêu cầu nạp tiền.'; end if;
  v_balance := v_wallet.balance - v_order.total_amount;
  update public.wallet_accounts set balance = v_balance, updated_at = now() where user_id = auth.uid();
  insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, reference_type, reference_id, note, created_by) values (auth.uid(), 'wallet_payment', -v_order.total_amount, v_balance, 'order', v_order.id, concat('Thanh toán đơn ', v_order.order_number), auth.uid());
  update public.orders set payment_method = 'wallet', status = 'paid', payment_confirmed_at = now(), payment_confirmation_note = 'Thanh toán bằng số dư NEXORA', updated_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

insert into public.customer_profiles (user_id, email) select id, email from auth.users on conflict (user_id) do update set email = excluded.email, updated_at = now() where public.customer_profiles.account_status <> 'deactivated';
insert into public.wallet_accounts (user_id) select id from auth.users on conflict (user_id) do nothing;
revoke all on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid), public.request_my_account_deletion(text), public.admin_close_customer_account(uuid, text), public.admin_update_email_delivery_settings(text, text, text, text, text, integer, text), public.admin_update_password_recovery_email_template(text, text, text, text, text, text), public.enforce_active_order_account() from public;
revoke execute on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid), public.request_my_account_deletion(text), public.admin_close_customer_account(uuid, text), public.admin_update_email_delivery_settings(text, text, text, text, text, integer, text), public.admin_update_password_recovery_email_template(text, text, text, text, text, text), public.enforce_active_order_account() from anon;
revoke execute on function public.enforce_active_order_account() from authenticated;
grant execute on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid), public.request_my_account_deletion(text), public.admin_close_customer_account(uuid, text), public.admin_update_email_delivery_settings(text, text, text, text, text, integer, text), public.admin_update_password_recovery_email_template(text, text, text, text, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- 6. DỮ LIỆU KHỞI TẠO: CẬP NHẬT THEO NHU CẦU TRƯỚC KHI VẬN HÀNH THẬT
-- --------------------------------------------------------------------------
insert into public.site_settings (singleton, logo_url, hero_image_url)
values (true, '/manus-storage/nexora-logo_3c03446b.png', '/manus-storage/nexora-hero-tech_47c6b78f.jpg') on conflict (singleton) do nothing;

insert into public.site_pages (slug, title, subtitle, content) values
('about','Về NEXORA','Nền tảng công nghệ chọn lọc, minh bạch và có trách nhiệm.','NEXORA kết nối người mua với thiết bị công nghệ có thông tin giá, ưu đãi và tình trạng hàng hóa rõ ràng.\n\nChúng tôi ưu tiên trải nghiệm gọn gàng, các cam kết dễ kiểm tra và hỗ trợ sau đơn qua những kênh công bố trên website.'),
('terms','Điều khoản sử dụng','Các nguyên tắc giúp trải nghiệm mua sắm diễn ra rõ ràng và an toàn.','Khi truy cập hoặc sử dụng NEXORA, bạn đồng ý sử dụng dịch vụ cho mục đích hợp pháp và cung cấp thông tin chính xác khi tạo đơn hàng.\n\nGiá, tồn kho, ưu đãi và thời gian xử lý đơn được hiển thị theo thông tin tại thời điểm đặt hàng.'),
('privacy','Chính sách bảo mật','Cam kết xử lý thông tin tài khoản và đơn hàng một cách cẩn trọng.','NEXORA chỉ sử dụng thông tin cần thiết để tạo tài khoản, xử lý đơn hàng, hỗ trợ khách hàng và cải thiện chất lượng phục vụ.\n\nThông tin tài khoản và đơn hàng được bảo vệ bằng cơ chế phân quyền phù hợp.'),
('shipping-returns','Giao hàng và đổi trả','Thông tin cần biết trước khi hoàn tất đơn hàng.','Thời gian giao hàng, chi phí vận chuyển và khu vực phục vụ được xác nhận theo từng đơn hàng.\n\nĐể yêu cầu đổi trả hoặc hỗ trợ bảo hành, vui lòng gửi mã đơn, mô tả tình trạng và hình ảnh liên quan đến kênh hỗ trợ.'),
('seller-guide','Dành cho gian hàng','Nguyên tắc trình bày sản phẩm và phục vụ người mua.','Gian hàng cần cung cấp thông tin hàng hóa trung thực, bao gồm mô tả, giá, tồn kho, bảo hành và điều kiện giao hàng.\n\nKhông đăng tải nội dung vi phạm pháp luật, xâm phạm sở hữu trí tuệ hoặc gây hiểu nhầm về giá.'),
('contact','Trung tâm hỗ trợ','Kênh liên hệ và quy trình phản hồi của NEXORA.','Để được hỗ trợ về đơn hàng, sản phẩm hoặc chính sách, hãy liên hệ qua email hiển thị trên website và cung cấp mã đơn nếu có.')
on conflict (slug) do nothing;

insert into public.faqs (question, answer, sort_order, is_published) values
('Tôi có cần tạo tài khoản để đặt hàng không?','Bạn có thể xem catalog mà không cần đăng nhập. Để tạo đơn hàng và đồng bộ thanh toán, bạn cần đăng nhập bằng email.',10,true),
('Làm thế nào để thanh toán đơn hàng?','Sau khi tạo đơn, hãy quét VietQR hoặc MoMo và kiểm tra đúng mã đơn, số tiền trước khi xác nhận.',20,true),
('Tôi muốn đổi trả hoặc bảo hành thì làm gì?','Gửi mã đơn, mô tả và hình ảnh liên quan đến kênh hỗ trợ để được hướng dẫn.',30,true)
on conflict do nothing;

insert into public.shops (name, slug, description, category, banner_url, contact_email, is_verified, is_active) values
('NEXORA Select','nexora-select','Thiết bị chính hãng, phụ kiện thiết yếu và các ưu đãi theo mùa.','Công nghệ tuyển chọn','/manus-storage/nexora-hero-tech_47c6b78f.jpg','support@nexora.vn',true,true),
('Nova Mobile','nova-mobile','Thiết bị di động, phụ kiện bảo vệ và tư vấn lựa chọn theo nhu cầu.','Điện thoại','/manus-storage/nexora-phone-category_b50b5ab7.jpg','support@nexora.vn',true,true),
('Orion Compute','orion-compute','Laptop và giải pháp làm việc di động cho học tập, sáng tạo và doanh nghiệp nhỏ.','Laptop','/manus-storage/nexora-laptop-category_9690fafd.jpg','support@nexora.vn',true,true)
on conflict (slug) do nothing;

insert into public.sale_campaigns (code, title, description, badge_text, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, starts_at, ends_at, usage_limit, is_active, is_hunt_featured) values
('HUNTCYAN10','Săn Sale Cyan 10%','Giảm 10% cho đơn từ 3.000.000đ. Ưu đãi giới hạn theo lượt sử dụng.','SĂN SALE 10%','percent',10,3000000,1000000,now(),now() + interval '30 days',300,true,true),
('TECH500K','Tech Deal 500K','Giảm trực tiếp 500.000đ cho đơn từ 12.000.000đ.','GIẢM 500K','fixed',500000,12000000,null,now(),now() + interval '30 days',100,true,false)
on conflict (code) do nothing;

insert into public.products (sku, name, slug, brand, category, description, image_url, technical_specs, price, original_price, stock, warranty_months, is_active, is_sale, featured) values
('NXR-PHOTON-X-256','NEXORA Photon X Pro 256GB','nexora-photon-x-pro-256gb','NEXORA','Điện thoại','Màn hình OLED 6.7 inch 120Hz, camera 50MP, chip flagship và sạc nhanh 80W.','https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85','{"chipset":"X8 Pro","ram":"12GB","storage":"256GB","display":"6.7 inch OLED 120Hz","battery":"5000mAh, sạc 80W","os":"NEXORA OS"}',20990000,24990000,18,24,true,true,true),
('NXR-ORION-AIR-14','Orion Book Air 14','orion-book-air-14','Orion','Laptop','Laptop 14 inch mỏng nhẹ, chip hiệu năng cao, RAM 16GB và SSD 512GB.','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85','{"processor":"Intel Core Ultra 7","ram":"16GB LPDDR5X","storage":"512GB SSD","display":"14 inch 2.8K","graphics":"Intel Arc","os":"Windows 11"}',18990000,22990000,12,24,true,true,true),
('NXR-PULSE-ANC','Pulse Buds ANC','pulse-buds-anc','Pulse','Phụ kiện','Tai nghe không dây chống ồn chủ động, âm thanh không gian và pin đến 30 giờ.','https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85','{"connectivity":"Bluetooth 5.3","battery":"30 giờ cùng hộp sạc","extras":"ANC, âm thanh không gian"}',1490000,2190000,40,12,true,true,true),
('NXR-VERTEX-S-128','Vertex Phone S 128GB','vertex-phone-s-128gb','Vertex','Điện thoại','Thiết kế titan bền bỉ, camera kép linh hoạt, pin cả ngày và màn hình sáng.','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85','{"chipset":"Vertex A16","ram":"8GB","storage":"128GB","display":"6.1 inch OLED","battery":"4200mAh"}',14990000,16990000,25,18,true,true,false),
('NXR-APEX-16','Apex Station 16','apex-station-16','Apex','Laptop','Laptop hiệu năng sáng tạo với màn hình 16 inch, RAM 32GB và đồ họa rời.','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85','{"processor":"Intel Core i9","ram":"32GB","storage":"1TB SSD","graphics":"RTX 4060","display":"16 inch 2.5K"}',32990000,32990000,8,24,true,false,false),
('NXR-FLUX-65','NEXORA Flux 65 Mechanical','nexora-flux-65-mechanical','NEXORA','Phụ kiện','Bàn phím cơ 65% kết nối ba chế độ, switch tuyến tính và RGB tùy biến.','https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85','{"connectivity":"USB-C, Bluetooth, 2.4GHz","extras":"Layout 65%, hot-swap, RGB"}',1690000,2490000,32,12,true,true,false)
on conflict (sku) do update set name = excluded.name, slug = excluded.slug, brand = excluded.brand, category = excluded.category, description = excluded.description, image_url = excluded.image_url, technical_specs = excluded.technical_specs, price = excluded.price, original_price = excluded.original_price, stock = excluded.stock, warranty_months = excluded.warranty_months, is_active = excluded.is_active, is_sale = excluded.is_sale, featured = excluded.featured, updated_at = now();

-- Tạo admin đầu tiên SAU KHI đăng ký tài khoản: thay email rồi chạy riêng 3 dòng dưới.
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'admin@yourdomain.com'
-- on conflict (user_id) do nothing;

-- --------------------------------------------------------------------------
-- 7. ROLE, KIỂM DUYỆT VÀ BÀI VIẾT (đồng bộ migration role-content-affiliate)
-- --------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer',
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_definitions (
  role_key text primary key check (role_key ~ '^[a-z][a-z0-9_]{2,48}$'),
  display_name text not null check (length(trim(display_name)) between 2 and 80),
  description text not null default '',
  capabilities jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  assignable_by_moderator boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.role_definitions (role_key, display_name, description, capabilities, is_system, assignable_by_moderator) values
  ('customer', 'Khách hàng', 'Quyền mua hàng cơ bản.', '{"commandDeck":false,"articles":false,"moderation":false,"orders":false,"roles":false,"siteSettings":false}'::jsonb, true, true),
  ('affiliate', 'Affiliate', 'Được tạo bài viết sau khi được duyệt affiliate.', '{"commandDeck":false,"articles":true,"moderation":false,"orders":false,"roles":false,"siteSettings":false}'::jsonb, true, true),
  ('marketing', 'Marketing', 'Quản lý và tạo nội dung bài viết.', '{"commandDeck":true,"articles":true,"moderation":false,"orders":false,"roles":false,"siteSettings":false}'::jsonb, true, true),
  ('order_manager', 'Quản lý đơn hàng', 'Quản lý đơn, hoàn tiền và vận hành giao nhận.', '{"commandDeck":true,"articles":false,"moderation":false,"orders":true,"roles":false,"siteSettings":false}'::jsonb, true, true),
  ('moderator', 'Moderator', 'Kiểm duyệt nội dung và phân role không phải admin.', '{"commandDeck":true,"articles":true,"moderation":true,"orders":false,"roles":true,"siteSettings":false}'::jsonb, true, true),
  ('admin', 'Quản trị viên', 'Toàn quyền vận hành và cấu hình hệ thống.', '{"commandDeck":true,"articles":true,"moderation":true,"orders":true,"roles":true,"siteSettings":true}'::jsonb, true, false)
on conflict (role_key) do nothing;

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles drop constraint if exists user_roles_role_fkey;
alter table public.user_roles add constraint user_roles_role_fkey foreign key (role) references public.role_definitions(role_key) on update cascade on delete restrict;

insert into public.user_roles (user_id, role, assigned_by)
select user_id, 'admin', user_id from public.admin_users
on conflict (user_id) do update set role = 'admin', updated_at = now();

create index if not exists user_roles_role_idx on public.user_roles(role);
alter table public.user_roles enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
      or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_role(p_role text)
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select case when p_role = 'admin' then public.is_admin()
    else exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role) end;
$$;

create or replace function public.has_any_role(p_roles text[])
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select public.is_admin() or exists (select 1 from public.user_roles where user_id = auth.uid() and role = any(p_roles));
$$;

create or replace function public.has_role_capability(p_capability text)
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select public.is_admin() or exists (
    select 1 from public.user_roles ur
    join public.role_definitions rd on rd.role_key = ur.role
    where ur.user_id = auth.uid()
      and coalesce((rd.capabilities ->> p_capability)::boolean, false)
  );
$$;

create or replace function public.can_manage_roles()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_role_capability('roles'); $$;

create or replace function public.can_manage_role_definitions()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.is_admin(); $$;

create or replace function public.can_moderate_content()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_role_capability('moderation'); $$;

create or replace function public.can_manage_orders()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_role_capability('orders'); $$;

create or replace function public.can_write_articles()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_role_capability('articles'); $$;

create or replace function public.can_access_command_deck()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_role_capability('commandDeck'); $$;

drop policy if exists "Users can read own special role" on public.user_roles;
create policy "Users can read own special role" on public.user_roles for select to authenticated using (user_id = auth.uid());
drop policy if exists "Role managers can read all roles" on public.user_roles;
create policy "Role managers can read all roles" on public.user_roles for select to authenticated using (public.can_manage_roles());
alter table public.role_definitions enable row level security;
drop policy if exists "Authenticated users can read role definitions" on public.role_definitions;
create policy "Authenticated users can read role definitions" on public.role_definitions for select to authenticated using (true);
drop policy if exists "Role managers can read customer profiles" on public.customer_profiles;
create policy "Role managers can read customer profiles" on public.customer_profiles for select to authenticated using (public.can_manage_roles());

create or replace function public.assign_user_role(p_user_id uuid, p_role text, p_note text default null)
returns public.user_roles language plpgsql security definer set search_path = public, auth
as $$
declare v_role public.user_roles; v_current text; v_target public.role_definitions;
begin
  if not public.can_manage_roles() then raise exception 'Bạn không có quyền quản lý role.'; end if;
  select * into v_target from public.role_definitions where role_key = p_role;
  if not found then raise exception 'Role không hợp lệ.'; end if;
  select role into v_current from public.user_roles where user_id = p_user_id;
  if not public.is_admin() and (p_role = 'admin' or v_current = 'admin' or not v_target.assignable_by_moderator) then raise exception 'Chỉ admin được gán hoặc thay đổi role này.'; end if;
  insert into public.user_roles (user_id, role, assigned_by) values (p_user_id, p_role, auth.uid())
  on conflict (user_id) do update set role = excluded.role, assigned_by = excluded.assigned_by, assigned_at = now(), updated_at = now()
  returning * into v_role;
  if p_role = 'admin' then
    insert into public.admin_users (user_id) values (p_user_id) on conflict (user_id) do nothing;
  else
    delete from public.admin_users where user_id = p_user_id and not exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin');
  end if;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata)
  values (p_user_id, auth.uid(), 'role_assigned', jsonb_build_object('role', p_role, 'note', nullif(trim(p_note), '')));
  return v_role;
end;
$$;

create or replace function public.admin_save_role_definition(p_role_key text, p_display_name text, p_description text, p_capabilities jsonb, p_assignable_by_moderator boolean default true)
returns public.role_definitions language plpgsql security definer set search_path = public, auth
as $$
declare v_role public.role_definitions; v_existing public.role_definitions;
begin
  if not public.can_manage_role_definitions() then raise exception 'Chỉ admin được tạo hoặc chỉnh role.'; end if;
  if p_role_key !~ '^[a-z][a-z0-9_]{2,48}$' then raise exception 'Mã role chỉ gồm chữ thường, số, gạch dưới và dài 3–49 ký tự.'; end if;
  if length(trim(p_display_name)) < 2 then raise exception 'Tên hiển thị role phải có ít nhất 2 ký tự.'; end if;
  select * into v_existing from public.role_definitions where role_key = p_role_key;
  if p_role_key = 'admin' then
    p_capabilities := '{"commandDeck":true,"articles":true,"moderation":true,"orders":true,"roles":true,"siteSettings":true}'::jsonb;
    p_assignable_by_moderator := false;
  end if;
  insert into public.role_definitions (role_key, display_name, description, capabilities, is_system, assignable_by_moderator, created_by)
  values (p_role_key, trim(p_display_name), coalesce(trim(p_description), ''), coalesce(p_capabilities, '{}'::jsonb), coalesce(v_existing.is_system, false), p_assignable_by_moderator, auth.uid())
  on conflict (role_key) do update set display_name = excluded.display_name, description = excluded.description, capabilities = excluded.capabilities, assignable_by_moderator = excluded.assignable_by_moderator, updated_at = now()
  returning * into v_role;
  insert into public.account_audit_log (actor_user_id, action, metadata) values (auth.uid(), 'role_definition_saved', jsonb_build_object('role_key', v_role.role_key, 'display_name', v_role.display_name));
  return v_role;
end;
$$;

create or replace function public.admin_delete_role_definition(p_role_key text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_role public.role_definitions;
begin
  if not public.can_manage_role_definitions() then raise exception 'Chỉ admin được xóa role.'; end if;
  select * into v_role from public.role_definitions where role_key = p_role_key;
  if not found then raise exception 'Không tìm thấy role.'; end if;
  if v_role.is_system then raise exception 'Không thể xóa role hệ thống; bạn có thể đổi tên hiển thị hoặc chỉnh capability.'; end if;
  if exists (select 1 from public.user_roles where role = p_role_key) then raise exception 'Hãy chuyển người dùng sang role khác trước khi xóa.'; end if;
  delete from public.role_definitions where role_key = p_role_key;
  insert into public.account_audit_log (actor_user_id, action, metadata) values (auth.uid(), 'role_definition_deleted', jsonb_build_object('role_key', p_role_key));
end;
$$;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, rating integer not null check (rating between 1 and 5),
  body text not null check (length(trim(body)) between 10 and 2000), status text not null default 'pending' check (status in ('pending', 'approved', 'hidden', 'rejected')),
  moderation_note text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(product_id, user_id)
);
create table if not exists public.product_comments (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, body text not null check (length(trim(body)) between 2 and 1200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden', 'rejected')),
  moderation_note text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null check (length(trim(title)) between 8 and 180),
  excerpt text not null default '', content text not null check (length(trim(content)) >= 40), cover_image_url text,
  author_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'hidden')),
  published_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists product_reviews_product_status_idx on public.product_reviews(product_id, status, created_at desc);
create index if not exists product_comments_product_status_idx on public.product_comments(product_id, status, created_at desc);
create index if not exists articles_status_published_idx on public.articles(status, published_at desc);
alter table public.product_reviews enable row level security;
alter table public.product_comments enable row level security;
alter table public.articles enable row level security;
create policy "Public reads approved reviews" on public.product_reviews for select using (status = 'approved');
create policy "Users read own reviews" on public.product_reviews for select to authenticated using (user_id = auth.uid());
create policy "Moderators read all reviews" on public.product_reviews for select to authenticated using (public.can_moderate_content());
create policy "Public reads approved comments" on public.product_comments for select using (status = 'approved');
create policy "Users read own comments" on public.product_comments for select to authenticated using (user_id = auth.uid());
create policy "Moderators read all comments" on public.product_comments for select to authenticated using (public.can_moderate_content());
create policy "Public reads published articles" on public.articles for select using (status = 'published');
create policy "Authors read own articles" on public.articles for select to authenticated using (author_id = auth.uid());
create policy "Moderators read all articles" on public.articles for select to authenticated using (public.can_moderate_content());

create or replace function public.submit_product_review(p_product_id uuid, p_rating integer, p_body text)
returns public.product_reviews language plpgsql security definer set search_path = public, auth
as $$
declare v_review public.product_reviews;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để đánh giá.'; end if;
  if p_rating not between 1 and 5 or length(trim(coalesce(p_body, ''))) < 10 then raise exception 'Đánh giá cần 1–5 sao và ít nhất 10 ký tự.'; end if;
  if not exists (select 1 from public.order_items oi join public.orders o on o.id = oi.order_id where oi.product_id = p_product_id and o.user_id = auth.uid() and (o.fulfillment_status = 'delivered' or o.status = 'completed')) then raise exception 'Chỉ khách đã nhận hàng mới được đánh giá.'; end if;
  insert into public.product_reviews (product_id, user_id, rating, body, status) values (p_product_id, auth.uid(), p_rating, trim(p_body), 'pending')
  on conflict (product_id, user_id) do update set rating = excluded.rating, body = excluded.body, status = 'pending', moderation_note = null, reviewed_by = null, reviewed_at = null, updated_at = now()
  returning * into v_review;
  return v_review;
end;
$$;

create or replace function public.submit_product_comment(p_product_id uuid, p_body text)
returns public.product_comments language plpgsql security definer set search_path = public, auth
as $$
declare v_comment public.product_comments;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để bình luận.'; end if;
  if length(trim(coalesce(p_body, ''))) < 2 then raise exception 'Bình luận quá ngắn.'; end if;
  insert into public.product_comments (product_id, user_id, body) values (p_product_id, auth.uid(), trim(p_body)) returning * into v_comment;
  return v_comment;
end;
$$;

create or replace function public.moderate_content(p_type text, p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.can_moderate_content() then raise exception 'Bạn không có quyền kiểm duyệt.'; end if;
  if p_type not in ('review', 'comment', 'article') or p_status not in ('approved', 'hidden', 'rejected', 'published', 'pending') then raise exception 'Nội dung hoặc trạng thái không hợp lệ.'; end if;
  if p_type = 'review' then
    update public.product_reviews set status = p_status, moderation_note = nullif(trim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = p_id;
  elsif p_type = 'comment' then
    update public.product_comments set status = p_status, moderation_note = nullif(trim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = p_id;
  else
    update public.articles set status = case when p_status = 'approved' then 'published' else p_status end, reviewed_by = auth.uid(), reviewed_at = now(), published_at = case when p_status in ('approved','published') then coalesce(published_at, now()) else published_at end, updated_at = now() where id = p_id;
  end if;
  if not found then raise exception 'Không tìm thấy nội dung.'; end if;
  insert into public.account_audit_log (actor_user_id, action, metadata) values (auth.uid(), 'content_moderated', jsonb_build_object('type', p_type, 'id', p_id, 'status', p_status, 'note', nullif(trim(p_note), '')));
end;
$$;

create or replace function public.save_my_article(p_id uuid, p_title text, p_slug text, p_excerpt text, p_content text, p_cover_image_url text default null, p_submit boolean default false)
returns public.articles language plpgsql security definer set search_path = public, auth
as $$
declare v_article public.articles; v_status text;
begin
  if not public.can_write_articles() then raise exception 'Bạn chưa có quyền tạo bài viết.'; end if;
  if length(trim(coalesce(p_title, ''))) < 8 or length(trim(coalesce(p_content, ''))) < 40 or trim(coalesce(p_slug, '')) !~ '^[a-z0-9-]+$' then raise exception 'Dữ liệu bài viết không hợp lệ.'; end if;
  v_status := case when p_submit then 'pending' else 'draft' end;
  if p_id is null then
    insert into public.articles (slug, title, excerpt, content, cover_image_url, author_id, status) values (trim(p_slug), trim(p_title), trim(coalesce(p_excerpt, '')), trim(p_content), nullif(trim(p_cover_image_url), ''), auth.uid(), v_status) returning * into v_article;
  else
    update public.articles set slug = trim(p_slug), title = trim(p_title), excerpt = trim(coalesce(p_excerpt, '')), content = trim(p_content), cover_image_url = nullif(trim(p_cover_image_url), ''), status = case when status = 'published' and not public.can_moderate_content() then status else v_status end, updated_at = now() where id = p_id and author_id = auth.uid() returning * into v_article;
    if not found then raise exception 'Không thể sửa bài viết này.'; end if;
  end if;
  return v_article;
end;
$$;

-- --------------------------------------------------------------------------
-- 8. AFFILIATE 15%, HOÀN TIỀN VÀ CMS NÂNG CAO
-- --------------------------------------------------------------------------
create table if not exists public.affiliate_program_settings (
  singleton boolean primary key default true check (singleton), active boolean not null default true,
  commission_rate numeric(5,2) not null default 15 check (commission_rate between 0 and 100),
  min_delivered_orders integer not null default 1 check (min_delivered_orders >= 0),
  min_delivered_amount numeric(12,0) not null default 0 check (min_delivered_amount >= 0),
  requires_approval boolean not null default true, updated_at timestamptz not null default now()
);
create table if not exists public.affiliate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade, referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{6,18}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.affiliate_referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  affiliate_user_id uuid not null references auth.users(id) on delete restrict,
  referral_code text not null, created_at timestamptz not null default now()
);
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete restrict,
  affiliate_user_id uuid not null references auth.users(id) on delete restrict, amount numeric(12,0) not null check (amount > 0),
  rate numeric(5,2) not null, status text not null default 'earned' check (status in ('earned', 'pending_reversal', 'reversed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists affiliate_profiles_status_idx on public.affiliate_profiles(status);
create index if not exists affiliate_commissions_user_created_idx on public.affiliate_commissions(affiliate_user_id, created_at desc);
alter table public.affiliate_program_settings enable row level security;
alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;
create policy "Public reads affiliate settings" on public.affiliate_program_settings for select using (true);
create policy "Users read own affiliate profile" on public.affiliate_profiles for select to authenticated using (user_id = auth.uid());
create policy "Managers read affiliate profiles" on public.affiliate_profiles for select to authenticated using (public.can_manage_roles());
create policy "Users read own referrals" on public.affiliate_referrals for select to authenticated using (affiliate_user_id = auth.uid() or referred_user_id = auth.uid());
create policy "Users read own commissions" on public.affiliate_commissions for select to authenticated using (affiliate_user_id = auth.uid());
create policy "Managers read commissions" on public.affiliate_commissions for select to authenticated using (public.can_manage_orders());

create or replace function public.request_affiliate_access()
returns public.affiliate_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_settings public.affiliate_program_settings; v_orders integer; v_amount numeric(12,0); v_profile public.affiliate_profiles; v_code text;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  select * into v_settings from public.affiliate_program_settings where singleton = true;
  if not found or not v_settings.active then raise exception 'Chương trình affiliate hiện chưa mở.'; end if;
  select count(*), coalesce(sum(total_amount),0) into v_orders, v_amount from public.orders where user_id = auth.uid() and fulfillment_status = 'delivered' and status in ('paid','processing','completed');
  if v_orders < v_settings.min_delivered_orders or v_amount < v_settings.min_delivered_amount then raise exception 'Tài khoản chưa đáp ứng điều kiện affiliate.'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.affiliate_profiles (user_id, referral_code, status) values (auth.uid(), v_code, case when v_settings.requires_approval then 'pending' else 'approved' end)
  on conflict (user_id) do update set status = case when affiliate_profiles.status = 'approved' then 'approved' else case when v_settings.requires_approval then 'pending' else 'approved' end end, updated_at = now()
  returning * into v_profile;
  return v_profile;
end;
$$;

create or replace function public.review_affiliate(p_user_id uuid, p_status text, p_note text default null)
returns public.affiliate_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.affiliate_profiles;
begin
  if not public.can_manage_roles() then raise exception 'Bạn không có quyền duyệt affiliate.'; end if;
  if p_status not in ('approved','rejected','suspended') then raise exception 'Trạng thái không hợp lệ.'; end if;
  update public.affiliate_profiles set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), note = nullif(trim(p_note), ''), updated_at = now() where user_id = p_user_id returning * into v_profile;
  if not found then raise exception 'Không tìm thấy hồ sơ affiliate.'; end if;
  if p_status = 'approved' then perform public.assign_user_role(p_user_id, 'affiliate', 'Affiliate được duyệt'); end if;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (p_user_id, auth.uid(), 'affiliate_reviewed', jsonb_build_object('status', p_status, 'note', nullif(trim(p_note), '')));
  return v_profile;
end;
$$;

create or replace function public.claim_affiliate_referral(p_referral_code text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_affiliate uuid;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để nhận giới thiệu.'; end if;
  select user_id into v_affiliate from public.affiliate_profiles where referral_code = upper(trim(p_referral_code)) and status = 'approved';
  if not found then raise exception 'Link affiliate không hợp lệ hoặc đã ngừng hoạt động.'; end if;
  if v_affiliate = auth.uid() then raise exception 'Bạn không thể dùng link giới thiệu của chính mình.'; end if;
  insert into public.affiliate_referrals (referred_user_id, affiliate_user_id, referral_code) values (auth.uid(), v_affiliate, upper(trim(p_referral_code))) on conflict (referred_user_id) do nothing;
end;
$$;

create or replace function public.admin_update_affiliate_program(p_active boolean, p_commission_rate numeric, p_min_delivered_orders integer, p_min_delivered_amount numeric, p_requires_approval boolean)
returns public.affiliate_program_settings language plpgsql security definer set search_path = public, auth
as $$
declare v_settings public.affiliate_program_settings;
begin
  if not public.is_admin() then raise exception 'Chỉ admin được cập nhật chương trình affiliate.'; end if;
  if p_commission_rate < 0 or p_commission_rate > 100 then raise exception 'Tỷ lệ hoa hồng phải nằm trong khoảng 0–100%%.'; end if;
  if p_min_delivered_orders < 0 or p_min_delivered_amount < 0 then raise exception 'Điều kiện affiliate không hợp lệ.'; end if;
  insert into public.affiliate_program_settings (singleton, active, commission_rate, min_delivered_orders, min_delivered_amount, requires_approval, updated_at)
  values (true, p_active, p_commission_rate, p_min_delivered_orders, p_min_delivered_amount, p_requires_approval, now())
  on conflict (singleton) do update set active = excluded.active, commission_rate = excluded.commission_rate, min_delivered_orders = excluded.min_delivered_orders, min_delivered_amount = excluded.min_delivered_amount, requires_approval = excluded.requires_approval, updated_at = now()
  returning * into v_settings;
  insert into public.account_audit_log (actor_user_id, action, metadata) values (auth.uid(), 'affiliate_program_updated', jsonb_build_object('active', p_active, 'commission_rate', p_commission_rate, 'min_delivered_orders', p_min_delivered_orders, 'min_delivered_amount', p_min_delivered_amount, 'requires_approval', p_requires_approval));
  return v_settings;
end;
$$;
revoke all on function public.admin_update_affiliate_program(boolean,numeric,integer,numeric,boolean) from public, anon;
grant execute on function public.admin_update_affiliate_program(boolean,numeric,integer,numeric,boolean) to authenticated;

alter table public.orders add column if not exists affiliate_user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_affiliate_user_idx on public.orders(affiliate_user_id, created_at desc);
alter table public.wallet_ledger drop constraint if exists wallet_ledger_entry_type_check;
alter table public.wallet_ledger add constraint wallet_ledger_entry_type_check check (entry_type in ('topup', 'admin_credit', 'admin_debit', 'wallet_payment', 'refund', 'affiliate_commission'));

create or replace function public.attach_affiliate_to_order()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if new.affiliate_user_id is null then select affiliate_user_id into new.affiliate_user_id from public.affiliate_referrals where referred_user_id = new.user_id; end if;
  return new;
end;
$$;
drop trigger if exists attach_affiliate_to_order_trigger on public.orders;
create trigger attach_affiliate_to_order_trigger before insert on public.orders for each row execute function public.attach_affiliate_to_order();

create or replace function public.create_affiliate_commission()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
declare v_setting public.affiliate_program_settings; v_amount numeric(12,0); v_wallet public.wallet_accounts; v_balance numeric(12,0);
begin
  if new.affiliate_user_id is null or new.fulfillment_status <> 'delivered' or new.status not in ('paid','processing','completed') then return new; end if;
  if exists (select 1 from public.affiliate_commissions where order_id = new.id) then return new; end if;
  select * into v_setting from public.affiliate_program_settings where singleton = true and active = true;
  if not found then return new; end if;
  v_amount := floor(new.total_amount * v_setting.commission_rate / 100);
  if v_amount <= 0 then return new; end if;
  insert into public.wallet_accounts (user_id) values (new.affiliate_user_id) on conflict (user_id) do nothing;
  select * into v_wallet from public.wallet_accounts where user_id = new.affiliate_user_id for update;
  v_balance := v_wallet.balance + v_amount;
  update public.wallet_accounts set balance = v_balance, updated_at = now() where user_id = new.affiliate_user_id;
  insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, reference_type, reference_id, note) values (new.affiliate_user_id, 'affiliate_commission', v_amount, v_balance, 'order', new.id, concat('Hoa hồng affiliate đơn ', new.order_number));
  insert into public.affiliate_commissions (order_id, affiliate_user_id, amount, rate) values (new.id, new.affiliate_user_id, v_amount, v_setting.commission_rate);
  insert into public.account_audit_log (target_user_id, action, metadata) values (new.affiliate_user_id, 'affiliate_commission_earned', jsonb_build_object('order_id', new.id, 'amount', v_amount, 'rate', v_setting.commission_rate));
  return new;
end;
$$;
drop trigger if exists create_affiliate_commission_trigger on public.orders;
create trigger create_affiliate_commission_trigger after update of fulfillment_status, status on public.orders for each row execute function public.create_affiliate_commission();

alter table public.products add column if not exists shop_id uuid references public.shops(id) on delete set null;
alter table public.orders add column if not exists refund_status text not null default 'none' check (refund_status in ('none','requested','approved','refunded','rejected'));
alter table public.orders add column if not exists refund_amount numeric(12,0) not null default 0 check (refund_amount >= 0);
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict, amount numeric(12,0) not null check (amount > 0), reason text not null check (length(trim(reason)) >= 5),
  status text not null default 'pending' check (status in ('pending','approved','refunded','rejected')),
  refund_method text check (refund_method in ('wallet','manual')), review_note text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists refund_requests_status_created_idx on public.refund_requests(status, created_at desc);
alter table public.refund_requests enable row level security;
create policy "Users read own refund requests" on public.refund_requests for select to authenticated using (user_id = auth.uid());
create policy "Order managers read refunds" on public.refund_requests for select to authenticated using (public.can_manage_orders());

create or replace function public.request_order_refund(p_order_id uuid, p_amount numeric, p_reason text)
returns public.refund_requests language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_request public.refund_requests;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if v_order.status not in ('paid','processing','completed') then raise exception 'Đơn hàng chưa đủ điều kiện yêu cầu hoàn tiền.'; end if;
  if p_amount <= 0 or p_amount > v_order.total_amount or length(trim(coalesce(p_reason,''))) < 5 then raise exception 'Thông tin hoàn tiền không hợp lệ.'; end if;
  insert into public.refund_requests (order_id, user_id, amount, reason) values (p_order_id, auth.uid(), p_amount, trim(p_reason)) returning * into v_request;
  update public.orders set refund_status = 'requested', updated_at = now() where id = p_order_id;
  return v_request;
end;
$$;

create or replace function public.review_refund_request(p_request_id uuid, p_decision text, p_method text default 'wallet', p_note text default null)
returns public.refund_requests language plpgsql security definer set search_path = public, auth
as $$
declare v_request public.refund_requests; v_wallet public.wallet_accounts; v_balance numeric(12,0);
begin
  if not public.can_manage_orders() then raise exception 'Bạn không có quyền duyệt hoàn tiền.'; end if;
  if p_decision not in ('approved','refunded','rejected') or p_method not in ('wallet','manual') then raise exception 'Quyết định hoàn tiền không hợp lệ.'; end if;
  select * into v_request from public.refund_requests where id = p_request_id for update;
  if not found or v_request.status not in ('pending','approved') then raise exception 'Yêu cầu hoàn tiền không thể xử lý.'; end if;
  update public.refund_requests set status = p_decision, refund_method = p_method, review_note = nullif(trim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = p_request_id returning * into v_request;
  update public.orders set refund_status = p_decision, refund_amount = case when p_decision = 'refunded' then v_request.amount else refund_amount end, updated_at = now() where id = v_request.order_id;
  if p_decision = 'refunded' and p_method = 'wallet' then
    insert into public.wallet_accounts (user_id) values (v_request.user_id) on conflict (user_id) do nothing;
    select * into v_wallet from public.wallet_accounts where user_id = v_request.user_id for update;
    v_balance := v_wallet.balance + v_request.amount;
    update public.wallet_accounts set balance = v_balance, updated_at = now() where user_id = v_request.user_id;
    insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, reference_type, reference_id, note, created_by) values (v_request.user_id, 'refund', v_request.amount, v_balance, 'refund_request', v_request.id, coalesce(nullif(trim(p_note), ''), 'Hoàn tiền đơn hàng'), auth.uid());
  end if;
  update public.affiliate_commissions set status = 'pending_reversal', updated_at = now() where order_id = v_request.order_id and status = 'earned';
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (v_request.user_id, auth.uid(), 'refund_reviewed', jsonb_build_object('request_id', v_request.id, 'status', p_decision, 'method', p_method, 'amount', v_request.amount));
  return v_request;
end;
$$;

drop policy if exists "Admins can manage all orders" on public.orders;
create policy "Order managers can manage all orders" on public.orders for all to authenticated using (public.can_manage_orders()) with check (public.can_manage_orders());
drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Order managers can read all order items" on public.order_items for select to authenticated using (public.can_manage_orders());
drop policy if exists "Admins can manage site settings" on public.site_settings;
drop policy if exists "Site setting managers can manage site settings" on public.site_settings;
create policy "Site setting managers can manage site settings" on public.site_settings for all to authenticated using (public.has_role_capability('siteSettings')) with check (public.has_role_capability('siteSettings'));

alter table public.site_settings add column if not exists favicon_url text;
alter table public.site_settings add column if not exists seo_title text;
alter table public.site_settings add column if not exists seo_description text;
alter table public.site_settings add column if not exists seo_og_image_url text;
alter table public.site_settings add column if not exists announcement_text_en text;
alter table public.site_settings add column if not exists site_tagline_en text;
alter table public.site_settings add column if not exists hero_kicker_en text;
alter table public.site_settings add column if not exists hero_title_en text;
alter table public.site_settings add column if not exists hero_emphasis_en text;
alter table public.site_settings add column if not exists hero_description_en text;
alter table public.faqs add column if not exists question_en text;
alter table public.faqs add column if not exists answer_en text;
alter table public.site_pages add column if not exists title_en text;
alter table public.site_pages add column if not exists subtitle_en text;
alter table public.site_pages add column if not exists content_en text;
alter table public.site_settings add column if not exists payment_bank_id text;
alter table public.site_settings add column if not exists payment_account_number text;
alter table public.site_settings add column if not exists payment_account_name text;
alter table public.site_settings add column if not exists payment_momo_phone text;
alter table public.site_settings add column if not exists payment_zalopay_qr_url text;
alter table public.site_settings add column if not exists storefront_effect text not null default 'none' check (storefront_effect in ('none','snow','cherry_blossom'));
alter table public.site_settings add column if not exists storefront_effect_color text not null default '#d8f3ff';
alter table public.site_settings add column if not exists storefront_effect_density integer not null default 24 check (storefront_effect_density between 0 and 120);

revoke all on table public.user_roles, public.role_definitions, public.affiliate_profiles, public.affiliate_referrals, public.affiliate_commissions, public.refund_requests from anon, authenticated;
grant select on table public.user_roles, public.role_definitions, public.affiliate_profiles, public.affiliate_referrals, public.affiliate_commissions, public.refund_requests to authenticated;
grant select on table public.product_reviews, public.product_comments, public.articles, public.affiliate_program_settings to anon, authenticated;
revoke all on function public.has_role(text), public.has_any_role(text[]), public.has_role_capability(text), public.can_manage_roles(), public.can_manage_role_definitions(), public.can_moderate_content(), public.can_manage_orders(), public.can_write_articles(), public.can_access_command_deck(), public.assign_user_role(uuid,text,text), public.admin_save_role_definition(text,text,text,jsonb,boolean), public.admin_delete_role_definition(text), public.submit_product_review(uuid,integer,text), public.submit_product_comment(uuid,text), public.moderate_content(text,uuid,text,text), public.save_my_article(uuid,text,text,text,text,text,boolean), public.request_affiliate_access(), public.review_affiliate(uuid,text,text), public.claim_affiliate_referral(text), public.create_affiliate_commission(), public.attach_affiliate_to_order(), public.request_order_refund(uuid,numeric,text), public.review_refund_request(uuid,text,text,text) from public, anon;
revoke execute on function public.create_affiliate_commission(), public.attach_affiliate_to_order() from authenticated;
grant execute on function public.has_role(text), public.has_any_role(text[]), public.has_role_capability(text), public.can_manage_roles(), public.can_manage_role_definitions(), public.can_moderate_content(), public.can_manage_orders(), public.can_write_articles(), public.can_access_command_deck(), public.assign_user_role(uuid,text,text), public.admin_save_role_definition(text,text,text,jsonb,boolean), public.admin_delete_role_definition(text), public.submit_product_review(uuid,integer,text), public.submit_product_comment(uuid,text), public.moderate_content(text,uuid,text,text), public.save_my_article(uuid,text,text,text,text,text,boolean), public.request_affiliate_access(), public.review_affiliate(uuid,text,text), public.claim_affiliate_referral(text), public.request_order_refund(uuid,numeric,text), public.review_refund_request(uuid,text,text,text) to authenticated;

insert into public.affiliate_program_settings (singleton) values (true) on conflict (singleton) do nothing;

-- Liên kết seed catalog với shop tương ứng nhưng không ghi đè mapping admin đã chọn.
update public.products p set shop_id = case p.category
  when 'Điện thoại' then (select id from public.shops where slug = 'nova-mobile' limit 1)
  when 'Laptop' then (select id from public.shops where slug = 'orion-compute' limit 1)
  else (select id from public.shops where slug = 'nexora-select' limit 1)
end where p.shop_id is null;

-- Cập nhật badge moderation trong Command Deck khi review/comment mới vào queue pending.
alter publication supabase_realtime add table public.product_reviews;
alter publication supabase_realtime add table public.product_comments;

-- 26. Public branding assets: chỉ role có capability siteSettings được upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nexora-brand-assets', 'nexora-brand-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml']::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "NEXORA branding asset upload" on storage.objects;
create policy "NEXORA branding asset upload" on storage.objects for insert to authenticated
with check (bucket_id = 'nexora-brand-assets' and (storage.foldername(name))[1] = 'branding' and public.has_role_capability('siteSettings'));

-- 27. Đồng bộ Auth và vận chuyển: tài khoản mới phải xuất hiện ngay trong Command Deck.
create or replace function public.handle_auth_user_created()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
declare v_delivery_phone text := nullif(trim(new.raw_user_meta_data ->> 'delivery_phone'), ''); v_default_shipping_address text := nullif(trim(new.raw_user_meta_data ->> 'default_shipping_address'), '');
begin
  if v_delivery_phone is null or length(v_delivery_phone) not between 8 and 20 then raise exception 'Số điện thoại nhận hàng là bắt buộc.'; end if;
  if v_default_shipping_address is null or length(v_default_shipping_address) not between 8 and 500 then raise exception 'Địa chỉ nhận hàng là bắt buộc.'; end if;
  insert into public.customer_profiles (user_id, email, delivery_phone, default_shipping_address)
  values (new.id, new.email, v_delivery_phone, v_default_shipping_address)
  on conflict (user_id) do update set email = excluded.email, updated_at = now();
  insert into public.wallet_accounts (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_nexora on auth.users;
create trigger on_auth_user_created_nexora after insert on auth.users for each row execute procedure public.handle_auth_user_created();

create table if not exists public.shipping_carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 100),
  logo_url text,
  tracking_url_template text,
  note text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists shipping_carrier_id uuid references public.shipping_carriers(id) on delete set null;
alter table public.orders add column if not exists shipment_status text not null default 'not_ready' check (shipment_status in ('not_ready','packing','picked_up','in_transit','out_for_delivery','delivered','exception'));
alter table public.orders add column if not exists shipment_location text;
alter table public.orders add column if not exists shipment_location_at timestamptz;
alter table public.orders add column if not exists shipment_progress integer not null default 0 check (shipment_progress between 0 and 100);
alter table public.orders add column if not exists shipment_note text;
alter table public.orders add column if not exists shipment_updated_by uuid references auth.users(id) on delete set null;

create table if not exists public.order_shipment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shipment_status text not null check (shipment_status in ('not_ready','packing','picked_up','in_transit','out_for_delivery','delivered','exception')),
  location text,
  progress integer not null default 0 check (progress between 0 and 100),
  note text not null default '',
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists orders_shipping_carrier_idx on public.orders(shipping_carrier_id);
create index if not exists shipment_events_order_occurred_idx on public.order_shipment_events(order_id, occurred_at desc);

update public.role_definitions set capabilities = capabilities || '{"logistics":false}'::jsonb where role_key in ('customer','affiliate','marketing','order_manager') and not capabilities ? 'logistics';
update public.role_definitions set capabilities = capabilities || '{"logistics":true}'::jsonb where role_key in ('moderator','admin');
insert into public.role_definitions (role_key, display_name, description, capabilities, is_system, assignable_by_moderator)
values ('inventory_staff', 'Nhân viên kiểm hàng', 'Cập nhật nhà vận chuyển, vị trí và tiến trình giao nhận; không tự xác nhận thanh toán.', '{"commandDeck":true,"articles":false,"moderation":false,"orders":false,"roles":false,"siteSettings":false,"logistics":true}'::jsonb, true, true)
on conflict (role_key) do update set display_name = excluded.display_name, description = excluded.description, capabilities = public.role_definitions.capabilities || '{"logistics":true,"commandDeck":true}'::jsonb, updated_at = now();

create or replace function public.can_manage_shipments()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_role_capability('logistics'); $$;

alter table public.shipping_carriers enable row level security;
alter table public.order_shipment_events enable row level security;
drop policy if exists "Customers can read active shipping carriers" on public.shipping_carriers;
create policy "Customers can read active shipping carriers" on public.shipping_carriers for select to anon, authenticated using (is_active or public.can_manage_shipments());
drop policy if exists "Customers can read own shipment events" on public.order_shipment_events;
create policy "Customers can read own shipment events" on public.order_shipment_events for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.can_manage_shipments());
drop policy if exists "Shipment managers can insert events" on public.order_shipment_events;
create policy "Shipment managers can insert events" on public.order_shipment_events for insert to authenticated with check (public.can_manage_shipments());

create or replace function public.request_order_payment_confirmation(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để xác nhận thanh toán.'; end if;
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if v_order.status <> 'pending_payment' then raise exception 'Đơn hàng không còn chờ xác nhận thanh toán.'; end if;
  update public.orders set zalo_confirmation_requested_at = now(), updated_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.save_shipping_carrier(p_id uuid, p_name text, p_logo_url text, p_tracking_url_template text, p_note text, p_is_active boolean)
returns public.shipping_carriers language plpgsql security definer set search_path = public, auth
as $$
declare v_carrier public.shipping_carriers;
begin
  if not public.can_manage_shipments() then raise exception 'Bạn không có quyền quản lý vận chuyển.'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Tên nhà vận chuyển là bắt buộc.'; end if;
  insert into public.shipping_carriers (id, name, logo_url, tracking_url_template, note, is_active, created_by)
  values (coalesce(p_id, gen_random_uuid()), trim(p_name), nullif(trim(p_logo_url), ''), nullif(trim(p_tracking_url_template), ''), coalesce(trim(p_note), ''), coalesce(p_is_active, true), auth.uid())
  on conflict (id) do update set name = excluded.name, logo_url = excluded.logo_url, tracking_url_template = excluded.tracking_url_template, note = excluded.note, is_active = excluded.is_active, updated_at = now()
  returning * into v_carrier;
  return v_carrier;
end;
$$;

create or replace function public.save_order_shipment(p_order_id uuid, p_carrier_id uuid, p_tracking_code text, p_shipment_status text, p_location text, p_progress integer, p_note text, p_occurred_at timestamptz default now())
returns public.orders language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_carrier_name text; v_fulfillment text;
begin
  if not public.can_manage_shipments() then raise exception 'Bạn không có quyền cập nhật giao nhận.'; end if;
  if p_shipment_status not in ('not_ready','packing','picked_up','in_transit','out_for_delivery','delivered','exception') then raise exception 'Trạng thái giao nhận không hợp lệ.'; end if;
  if coalesce(p_progress, 0) not between 0 and 100 then raise exception 'Tiến trình phải từ 0 đến 100.'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if p_carrier_id is not null then select name into v_carrier_name from public.shipping_carriers where id = p_carrier_id; if not found then raise exception 'Nhà vận chuyển không hợp lệ.'; end if; end if;
  v_fulfillment := case p_shipment_status when 'not_ready' then 'unfulfilled' when 'packing' then 'preparing' when 'picked_up' then 'ready_to_ship' when 'in_transit' then 'shipped' when 'out_for_delivery' then 'shipped' when 'delivered' then 'delivered' else v_order.fulfillment_status end;
  update public.orders set shipping_carrier_id = p_carrier_id, carrier = coalesce(v_carrier_name, carrier), tracking_code = nullif(trim(p_tracking_code), ''), shipment_status = p_shipment_status, shipment_location = nullif(trim(p_location), ''), shipment_location_at = coalesce(p_occurred_at, now()), shipment_progress = coalesce(p_progress, 0), shipment_note = nullif(trim(p_note), ''), shipment_updated_by = auth.uid(), fulfillment_status = v_fulfillment, fulfillment_updated_at = now(), delivered_at = case when p_shipment_status = 'delivered' then now() else delivered_at end, updated_at = now() where id = p_order_id returning * into v_order;
  insert into public.order_shipment_events (order_id, shipment_status, location, progress, note, occurred_at, created_by) values (p_order_id, p_shipment_status, nullif(trim(p_location), ''), coalesce(p_progress, 0), coalesce(trim(p_note), ''), coalesce(p_occurred_at, now()), auth.uid());
  return v_order;
end;
$$;

create or replace function public.delete_shipping_carrier(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.can_manage_shipments() then raise exception 'Bạn không có quyền xóa nhà vận chuyển.'; end if;
  if exists (select 1 from public.orders where shipping_carrier_id = p_id) then raise exception 'Không thể xóa nhà vận chuyển đang được gắn với đơn hàng.'; end if;
  delete from public.shipping_carriers where id = p_id;
end;
$$;

revoke all on function public.can_manage_shipments(), public.request_order_payment_confirmation(uuid), public.save_shipping_carrier(uuid,text,text,text,text,boolean), public.save_order_shipment(uuid,uuid,text,text,text,integer,text,timestamptz), public.delete_shipping_carrier(uuid) from public, anon;
grant execute on function public.can_manage_shipments(), public.request_order_payment_confirmation(uuid), public.save_shipping_carrier(uuid,text,text,text,text,boolean), public.save_order_shipment(uuid,uuid,text,text,text,integer,text,timestamptz), public.delete_shipping_carrier(uuid) to authenticated;

-- 28. CK tự động đa nhà cung cấp. Credential luôn ở server environment, không nằm trong site_settings.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('vietqr', 'momo', 'zalopay', 'wallet', 'auto_transfer'));
alter table public.orders add column if not exists auto_transfer_provider text check (auto_transfer_provider in ('sepay', 'casso', 'vietqr'));
alter table public.orders add column if not exists auto_transfer_reference text;
alter table public.orders drop constraint if exists orders_auto_transfer_provider_check;
alter table public.orders add constraint orders_auto_transfer_provider_check check (payment_method <> 'auto_transfer' or auto_transfer_provider is not null);
alter table public.site_settings add column if not exists payment_auto_transfer_enabled boolean not null default false;
alter table public.site_settings add column if not exists payment_auto_transfer_provider text not null default 'sepay' check (payment_auto_transfer_provider in ('sepay', 'casso', 'vietqr'));

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('sepay', 'casso', 'vietqr')),
  provider_transaction_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  order_number text not null,
  amount numeric(12, 0) not null check (amount > 0),
  reference_text text not null default '',
  result text not null check (result in ('matched', 'order_not_found', 'amount_mismatch', 'not_active', 'already_paid')),
  received_at timestamptz not null default now(),
  unique(provider, provider_transaction_id)
);
create index if not exists payment_webhook_events_order_received_idx on public.payment_webhook_events(order_id, received_at desc);
alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from anon, authenticated;
grant select on table public.payment_webhook_events to authenticated;
drop policy if exists "Order managers can read payment webhook events" on public.payment_webhook_events;
create policy "Order managers can read payment webhook events" on public.payment_webhook_events for select to authenticated using (public.can_manage_orders());

create or replace function public.select_auto_transfer_payment(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_provider text; v_enabled boolean;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để chọn CK tự động.'; end if;
  select payment_auto_transfer_enabled, payment_auto_transfer_provider into v_enabled, v_provider from public.site_settings where singleton = true;
  if coalesce(v_enabled, false) is not true then raise exception 'CK tự động hiện chưa được shop bật.'; end if;
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if v_order.status <> 'pending_payment' then raise exception 'Đơn hàng không còn chờ thanh toán.'; end if;
  update public.orders set payment_method = 'auto_transfer', auto_transfer_provider = v_provider, auto_transfer_reference = v_order.order_number, payment_note = 'CK tự động · ' || upper(v_provider), updated_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.process_auto_transfer_webhook(p_provider text, p_transaction_id text, p_amount numeric, p_order_number text, p_reference text default '')
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_event_id uuid; v_enabled boolean; v_active_provider text; v_result text;
begin
  if p_provider not in ('sepay', 'casso', 'vietqr') then raise exception 'Nhà cung cấp không hợp lệ.'; end if;
  if nullif(trim(p_transaction_id), '') is null or p_amount is null or p_amount <= 0 or nullif(trim(p_order_number), '') is null then raise exception 'Dữ liệu webhook không hợp lệ.'; end if;
  select payment_auto_transfer_enabled, payment_auto_transfer_provider into v_enabled, v_active_provider from public.site_settings where singleton = true;
  if coalesce(v_enabled, false) is not true or v_active_provider <> p_provider then v_result := 'not_active';
  else
    select * into v_order from public.orders where order_number = trim(p_order_number) and payment_method = 'auto_transfer' and auto_transfer_provider = p_provider for update;
    if not found then v_result := 'order_not_found';
    elsif v_order.status = 'paid' then v_result := 'already_paid';
    elsif v_order.status <> 'pending_payment' then v_result := 'order_not_found';
    elsif v_order.total_amount <> p_amount then v_result := 'amount_mismatch';
    else v_result := 'matched'; end if;
  end if;
  insert into public.payment_webhook_events(provider, provider_transaction_id, order_id, order_number, amount, reference_text, result)
  values (p_provider, trim(p_transaction_id), case when v_result in ('matched','already_paid') then v_order.id else null end, trim(p_order_number), p_amount, left(coalesce(p_reference, ''), 500), v_result)
  on conflict (provider, provider_transaction_id) do nothing returning id into v_event_id;
  if v_event_id is null then return jsonb_build_object('duplicate', true, 'matched', false); end if;
  if v_result = 'matched' then
    update public.orders set status = 'paid', payment_confirmed_at = now(), payment_confirmation_note = 'Tự đối soát qua ' || upper(p_provider) || ' · mã giao dịch ' || left(trim(p_transaction_id), 80), updated_at = now() where id = v_order.id;
    insert into public.account_audit_log(target_user_id, actor_user_id, action, metadata) values (v_order.user_id, null, 'auto_transfer_matched', jsonb_build_object('provider', p_provider, 'order_number', v_order.order_number, 'amount', p_amount, 'transaction_id', left(trim(p_transaction_id), 80)));
  end if;
  return jsonb_build_object('duplicate', false, 'matched', v_result = 'matched', 'result', v_result);
end;
$$;

create or replace function public.guard_auto_transfer_paid_transition()
returns trigger language plpgsql security invoker set search_path = public, auth
as $$
begin
  if new.payment_method = 'auto_transfer' and old.status <> 'paid' and new.status = 'paid' and auth.uid() is not null then
    raise exception 'Đơn CK tự động chỉ được chuyển Đã thanh toán bởi webhook đã xác thực.';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_auto_transfer_paid_transition_trigger on public.orders;
create trigger guard_auto_transfer_paid_transition_trigger before update on public.orders for each row execute function public.guard_auto_transfer_paid_transition();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
exception when undefined_object then null;
end $$;

revoke all on function public.guard_auto_transfer_paid_transition() from public, anon, authenticated;
revoke all on function public.select_auto_transfer_payment(uuid), public.process_auto_transfer_webhook(text,text,numeric,text,text) from public, anon, authenticated;
grant execute on function public.select_auto_transfer_payment(uuid) to authenticated;
grant execute on function public.process_auto_transfer_webhook(text,text,numeric,text,text) to service_role;

-- 31. Dashboard affiliate: ghi nhận lượt mở link ẩn danh và tổng hợp chỉ cho affiliate đang đăng nhập.
create table if not exists public.affiliate_link_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null check (referral_code ~ '^[A-Z0-9]{6,18}$'),
  visitor_token uuid not null,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists affiliate_link_clicks_unique_visitor_product on public.affiliate_link_clicks(affiliate_user_id, visitor_token, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists affiliate_link_clicks_user_created_idx on public.affiliate_link_clicks(affiliate_user_id, created_at desc);
alter table public.affiliate_link_clicks enable row level security;
revoke all on table public.affiliate_link_clicks from anon, authenticated;

create or replace function public.track_affiliate_link_click(p_referral_code text, p_visitor_token uuid, p_product_id uuid default null)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_affiliate_user_id uuid; v_code text := upper(trim(p_referral_code));
begin
  if v_code !~ '^[A-Z0-9]{6,18}$' or p_visitor_token is null then return; end if;
  select user_id into v_affiliate_user_id from public.affiliate_profiles where referral_code = v_code and status = 'approved';
  if not found then return; end if;
  insert into public.affiliate_link_clicks(affiliate_user_id, referral_code, visitor_token, product_id)
  values (v_affiliate_user_id, v_code, p_visitor_token, p_product_id)
  on conflict (affiliate_user_id, visitor_token, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid)) do nothing;
end;
$$;

create or replace function public.get_my_affiliate_dashboard()
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.affiliate_profiles; v_program public.affiliate_program_settings; v_clicks integer := 0; v_referrals integer := 0; v_successful_orders integer := 0; v_earned numeric(12,0) := 0; v_pending_reversal numeric(12,0) := 0; v_reversed numeric(12,0) := 0; v_recent jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập để xem dashboard affiliate.'; end if;
  select * into v_profile from public.affiliate_profiles where user_id = auth.uid();
  select * into v_program from public.affiliate_program_settings where singleton = true;
  if not found then return jsonb_build_object('status', coalesce(v_profile.status, 'not_registered'), 'program', jsonb_build_object('active', false), 'generated_at', now()); end if;
  if v_profile is null or v_profile.status <> 'approved' then return jsonb_build_object('status', coalesce(v_profile.status, 'not_registered'), 'referral_code', coalesce(v_profile.referral_code, ''), 'program', jsonb_build_object('active', v_program.active, 'commission_rate', v_program.commission_rate, 'min_delivered_orders', v_program.min_delivered_orders, 'min_delivered_amount', v_program.min_delivered_amount), 'generated_at', now()); end if;
  select count(*) into v_clicks from public.affiliate_link_clicks where affiliate_user_id = auth.uid();
  select count(*) into v_referrals from public.affiliate_referrals where affiliate_user_id = auth.uid();
  select count(*) into v_successful_orders from public.orders where affiliate_user_id = auth.uid() and fulfillment_status = 'delivered' and status in ('paid','processing','completed');
  select coalesce(sum(amount) filter (where status = 'earned'), 0), coalesce(sum(amount) filter (where status = 'pending_reversal'), 0), coalesce(sum(amount) filter (where status = 'reversed'), 0) into v_earned, v_pending_reversal, v_reversed from public.affiliate_commissions where affiliate_user_id = auth.uid();
  select coalesce(jsonb_agg(jsonb_build_object('order_number', recent.order_number, 'amount', recent.amount, 'rate', recent.rate, 'status', recent.status, 'created_at', recent.created_at) order by recent.created_at desc), '[]'::jsonb) into v_recent from (select o.order_number, c.amount, c.rate, c.status, c.created_at from public.affiliate_commissions c join public.orders o on o.id = c.order_id where c.affiliate_user_id = auth.uid() order by c.created_at desc limit 20) recent;
  return jsonb_build_object('status', v_profile.status, 'referral_code', v_profile.referral_code, 'click_count', v_clicks, 'referral_count', v_referrals, 'successful_order_count', v_successful_orders, 'commission_earned', v_earned, 'commission_pending_reversal', v_pending_reversal, 'commission_reversed', v_reversed, 'recent_commissions', v_recent, 'program', jsonb_build_object('active', v_program.active, 'commission_rate', v_program.commission_rate, 'min_delivered_orders', v_program.min_delivered_orders, 'min_delivered_amount', v_program.min_delivered_amount), 'generated_at', now());
end;
$$;

revoke all on function public.track_affiliate_link_click(text,uuid,uuid), public.get_my_affiliate_dashboard() from public;
grant execute on function public.track_affiliate_link_click(text,uuid,uuid) to anon, authenticated;
grant execute on function public.get_my_affiliate_dashboard() to authenticated;

-- 32. Account Center cho phép cập nhật số điện thoại và địa chỉ độc lập; checkout vẫn bắt buộc đủ cả hai.
create or replace function public.update_my_account(p_display_name text, p_username text, p_delivery_phone text, p_default_shipping_address text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles; v_phone text := nullif(trim(p_delivery_phone), ''); v_address text := nullif(trim(p_default_shipping_address), '');
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status <> 'active') then raise exception 'Tài khoản hiện không thể cập nhật hồ sơ.'; end if;
  if p_delivery_phone is not null and (v_phone is null or length(v_phone) not between 8 and 20) then raise exception 'Số điện thoại nhận hàng cần từ 8 đến 20 ký tự.'; end if;
  if p_default_shipping_address is not null and (v_address is null or length(v_address) not between 8 and 500) then raise exception 'Địa chỉ nhận hàng cần từ 8 đến 500 ký tự.'; end if;
  perform public.ensure_my_account(null, null, null, null);
  if p_username is not null and (length(trim(p_username)) < 3 or trim(p_username) !~ '^[a-zA-Z0-9_.-]+$') then raise exception 'Username chỉ gồm 3–40 ký tự chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.'; end if;
  update public.customer_profiles set display_name = nullif(trim(p_display_name), ''), username = nullif(lower(trim(p_username)), ''), delivery_phone = case when p_delivery_phone is null then delivery_phone else v_phone end, default_shipping_address = case when p_default_shipping_address is null then default_shipping_address else v_address end, email = auth.jwt() ->> 'email', updated_at = now() where user_id = auth.uid() returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.update_my_account(text, text, text, text) from public, anon;
grant execute on function public.update_my_account(text, text, text, text) to authenticated;

-- 33. Sổ nhiều địa chỉ giao hàng: chỉ chủ tài khoản quản lý, một địa chỉ mặc định cho checkout.
create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Địa chỉ nhận hàng' check (length(trim(label)) between 1 and 60),
  address text not null check (length(trim(address)) between 8 and 500),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipping_addresses_user_updated_idx on public.shipping_addresses(user_id, updated_at desc);
create unique index if not exists shipping_addresses_one_default_idx on public.shipping_addresses(user_id) where is_default;
alter table public.shipping_addresses enable row level security;
revoke all on table public.shipping_addresses from public, anon, authenticated;

insert into public.shipping_addresses(user_id, label, address, is_default)
select p.user_id, 'Địa chỉ mặc định', p.default_shipping_address, true
from public.customer_profiles p
where nullif(trim(p.default_shipping_address), '') is not null
  and not exists (select 1 from public.shipping_addresses a where a.user_id = p.user_id);

create or replace function public.list_my_shipping_addresses()
returns setof public.shipping_addresses language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  return query select * from public.shipping_addresses where user_id = auth.uid() order by is_default desc, updated_at desc;
end;
$$;

create or replace function public.save_my_shipping_address(p_id uuid default null, p_label text default null, p_address text default null, p_make_default boolean default false)
returns public.shipping_addresses language plpgsql security definer set search_path = public, auth
as $$
declare v_address text := nullif(trim(p_address), ''); v_label text := coalesce(nullif(trim(p_label), ''), 'Địa chỉ nhận hàng'); v_item public.shipping_addresses; v_is_first boolean;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status <> 'active') then raise exception 'Tài khoản hiện không thể cập nhật địa chỉ.'; end if;
  if v_address is null or length(v_address) not between 8 and 500 then raise exception 'Địa chỉ nhận hàng cần từ 8 đến 500 ký tự.'; end if;
  if length(v_label) not between 1 and 60 then raise exception 'Nhãn địa chỉ cần từ 1 đến 60 ký tự.'; end if;
  perform public.ensure_my_account(null, null, null, null);
  if p_id is null then
    insert into public.shipping_addresses(user_id, label, address) values (auth.uid(), v_label, v_address) returning * into v_item;
  else
    update public.shipping_addresses set label = v_label, address = v_address, updated_at = now() where id = p_id and user_id = auth.uid() returning * into v_item;
    if not found then raise exception 'Không tìm thấy địa chỉ để cập nhật.'; end if;
  end if;
  select not exists (select 1 from public.shipping_addresses where user_id = auth.uid() and is_default) into v_is_first;
  if p_make_default or v_is_first or v_item.is_default then
    update public.shipping_addresses set is_default = false, updated_at = now() where user_id = auth.uid() and id <> v_item.id and is_default;
    update public.shipping_addresses set is_default = true, updated_at = now() where id = v_item.id returning * into v_item;
    update public.customer_profiles set default_shipping_address = v_item.address, updated_at = now() where user_id = auth.uid();
  end if;
  return v_item;
end;
$$;

create or replace function public.set_my_default_shipping_address(p_id uuid)
returns public.shipping_addresses language plpgsql security definer set search_path = public, auth
as $$
declare v_item public.shipping_addresses;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  select * into v_item from public.shipping_addresses where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Không tìm thấy địa chỉ của bạn.'; end if;
  update public.shipping_addresses set is_default = false, updated_at = now() where user_id = auth.uid() and id <> p_id and is_default;
  update public.shipping_addresses set is_default = true, updated_at = now() where id = p_id returning * into v_item;
  update public.customer_profiles set default_shipping_address = v_item.address, updated_at = now() where user_id = auth.uid();
  return v_item;
end;
$$;

create or replace function public.delete_my_shipping_address(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_deleted public.shipping_addresses; v_fallback public.shipping_addresses;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  delete from public.shipping_addresses where id = p_id and user_id = auth.uid() returning * into v_deleted;
  if not found then raise exception 'Không tìm thấy địa chỉ để xóa.'; end if;
  if v_deleted.is_default then
    select * into v_fallback from public.shipping_addresses where user_id = auth.uid() order by updated_at desc limit 1;
    if found then
      update public.shipping_addresses set is_default = true, updated_at = now() where id = v_fallback.id returning * into v_fallback;
      update public.customer_profiles set default_shipping_address = v_fallback.address, updated_at = now() where user_id = auth.uid();
    else
      update public.customer_profiles set default_shipping_address = null, updated_at = now() where user_id = auth.uid();
    end if;
  end if;
end;
$$;

revoke all on function public.list_my_shipping_addresses(), public.save_my_shipping_address(uuid,text,text,boolean), public.set_my_default_shipping_address(uuid), public.delete_my_shipping_address(uuid) from public, anon;
grant execute on function public.list_my_shipping_addresses(), public.save_my_shipping_address(uuid,text,text,boolean), public.set_my_default_shipping_address(uuid), public.delete_my_shipping_address(uuid) to authenticated;

-- 34. Username bắt buộc khi đăng ký, hủy đơn có kiểm soát và upload ảnh giao nhận.
create or replace function public.handle_auth_user_created()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
declare
  v_delivery_phone text := nullif(trim(new.raw_user_meta_data ->> 'delivery_phone'), '');
  v_default_shipping_address text := nullif(trim(new.raw_user_meta_data ->> 'default_shipping_address'), '');
  v_username text := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
begin
  if v_username is null or length(v_username) not between 3 and 40 or v_username !~ '^[a-z0-9_.-]+$' then raise exception 'Username cần từ 3 đến 40 ký tự và chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.'; end if;
  if exists (select 1 from public.customer_profiles where lower(username) = v_username) then raise exception 'Username này đã được sử dụng.'; end if;
  if v_delivery_phone is null or length(v_delivery_phone) not between 8 and 20 then raise exception 'Số điện thoại nhận hàng là bắt buộc.'; end if;
  if v_default_shipping_address is null or length(v_default_shipping_address) not between 8 and 500 then raise exception 'Địa chỉ nhận hàng là bắt buộc.'; end if;
  insert into public.customer_profiles (user_id, username, email, delivery_phone, default_shipping_address)
  values (new.id, v_username, new.email, v_delivery_phone, v_default_shipping_address)
  on conflict (user_id) do update set username = excluded.username, email = excluded.email, updated_at = now();
  insert into public.wallet_accounts (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.update_my_account(p_display_name text, p_username text, p_delivery_phone text, p_default_shipping_address text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles; v_phone text := nullif(trim(p_delivery_phone), ''); v_address text := nullif(trim(p_default_shipping_address), '');
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists (select 1 from public.customer_profiles where user_id = auth.uid() and account_status <> 'active') then raise exception 'Tài khoản hiện không thể cập nhật hồ sơ.'; end if;
  if p_delivery_phone is not null and (v_phone is null or length(v_phone) not between 8 and 20) then raise exception 'Số điện thoại nhận hàng cần từ 8 đến 20 ký tự.'; end if;
  if p_default_shipping_address is not null and (v_address is null or length(v_address) not between 8 and 500) then raise exception 'Địa chỉ nhận hàng cần từ 8 đến 500 ký tự.'; end if;
  if p_username is not null and (length(trim(p_username)) not between 3 and 40 or lower(trim(p_username)) !~ '^[a-z0-9_.-]+$') then raise exception 'Username cần từ 3 đến 40 ký tự và chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.'; end if;
  perform public.ensure_my_account(null, null, null, null);
  update public.customer_profiles set display_name = case when p_display_name is null then display_name else nullif(trim(p_display_name), '') end, username = case when p_username is null then username else nullif(lower(trim(p_username)), '') end, delivery_phone = case when p_delivery_phone is null then delivery_phone else v_phone end, default_shipping_address = case when p_default_shipping_address is null then default_shipping_address else v_address end, email = auth.jwt() ->> 'email', updated_at = now() where user_id = auth.uid() returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.update_my_account(text, text, text, text) from public, anon;
grant execute on function public.update_my_account(text, text, text, text) to authenticated;

alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists cancelled_by uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists cancellation_reason text;
alter table public.orders drop constraint if exists orders_cancellation_reason_check;
alter table public.orders add constraint orders_cancellation_reason_check check (cancellation_reason is null or length(trim(cancellation_reason)) between 1 and 400);

create or replace function public.guard_order_cancellation()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then raise exception 'Đơn đã hủy không thể khôi phục.'; end if;
  if old.status <> 'cancelled' and new.status = 'cancelled' then
    if current_setting('app.nexora_cancellation', true) <> 'allowed' then raise exception 'Hãy dùng quy trình hủy đơn được kiểm soát.'; end if;
    if old.status <> 'pending_payment' or coalesce(old.fulfillment_status, 'unfulfilled') <> 'unfulfilled' then raise exception 'Chỉ hủy được đơn chưa thanh toán và chưa vào giao nhận.'; end if;
    if new.cancelled_at is null or new.cancelled_by is null or nullif(trim(new.cancellation_reason), '') is null then raise exception 'Hủy đơn cần người thực hiện, thời gian và lý do.'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_order_cancellation_trigger on public.orders;
create trigger guard_order_cancellation_trigger before update on public.orders for each row execute procedure public.guard_order_cancellation();

create or replace function public.cancel_my_order(p_order_id uuid, p_reason text default null)
returns public.orders language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_reason text := coalesce(nullif(trim(p_reason), ''), 'Khách hàng hủy đơn trước khi thanh toán.');
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if length(v_reason) > 400 then raise exception 'Lý do hủy đơn tối đa 400 ký tự.'; end if;
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Không tìm thấy đơn hàng của bạn.'; end if;
  if v_order.status <> 'pending_payment' or coalesce(v_order.fulfillment_status, 'unfulfilled') <> 'unfulfilled' then raise exception 'Chỉ hủy được đơn chưa thanh toán và chưa vào giao nhận.'; end if;
  perform set_config('app.nexora_cancellation', 'allowed', true);
  update public.orders set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancellation_reason = v_reason, updated_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.cancel_order_as_manager(p_order_id uuid, p_reason text default null)
returns public.orders language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_reason text := coalesce(nullif(trim(p_reason), ''), 'Đơn được hủy bởi bộ phận vận hành.');
begin
  if auth.uid() is null or not public.can_manage_orders() then raise exception 'Bạn không có quyền hủy đơn.'; end if;
  if length(v_reason) > 400 then raise exception 'Lý do hủy đơn tối đa 400 ký tự.'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if v_order.status <> 'pending_payment' or coalesce(v_order.fulfillment_status, 'unfulfilled') <> 'unfulfilled' then raise exception 'Chỉ hủy được đơn chưa thanh toán và chưa vào giao nhận.'; end if;
  perform set_config('app.nexora_cancellation', 'allowed', true);
  update public.orders set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancellation_reason = v_reason, updated_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;
revoke all on function public.cancel_my_order(uuid,text), public.cancel_order_as_manager(uuid,text) from public, anon;
grant execute on function public.cancel_my_order(uuid,text), public.cancel_order_as_manager(uuid,text) to authenticated;

drop policy if exists "NEXORA carrier asset upload" on storage.objects;
create policy "NEXORA carrier asset upload" on storage.objects for insert to authenticated
with check (bucket_id = 'nexora-brand-assets' and (storage.foldername(name))[1] = 'carriers' and public.can_manage_shipments());

-- 35. Tài khoản mới ghi cả hồ sơ checkout và mục đầu tiên trong sổ địa chỉ.
create or replace function public.handle_auth_user_created()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
declare
  v_delivery_phone text := nullif(trim(new.raw_user_meta_data ->> 'delivery_phone'), '');
  v_default_shipping_address text := nullif(trim(new.raw_user_meta_data ->> 'default_shipping_address'), '');
  v_username text := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
begin
  if v_username is null or length(v_username) not between 3 and 40 or v_username !~ '^[a-z0-9_.-]+$' then raise exception 'Username cần từ 3 đến 40 ký tự và chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.'; end if;
  if exists (select 1 from public.customer_profiles where lower(username) = v_username) then raise exception 'Username này đã được sử dụng.'; end if;
  if v_delivery_phone is null or length(v_delivery_phone) not between 8 and 20 then raise exception 'Số điện thoại nhận hàng là bắt buộc.'; end if;
  if v_default_shipping_address is null or length(v_default_shipping_address) not between 8 and 500 then raise exception 'Địa chỉ nhận hàng là bắt buộc.'; end if;
  insert into public.customer_profiles (user_id, username, email, delivery_phone, default_shipping_address)
  values (new.id, v_username, new.email, v_delivery_phone, v_default_shipping_address)
  on conflict (user_id) do update set username = excluded.username, email = excluded.email, updated_at = now();
  if not exists (select 1 from public.shipping_addresses where user_id = new.id) then
    insert into public.shipping_addresses(user_id, label, address, is_default) values (new.id, 'Địa chỉ mặc định', v_default_shipping_address, true);
  end if;
  insert into public.wallet_accounts (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 36. Bài viết: xóa có xác nhận ở giao diện, quyền kiểm tra ở RPC và ảnh bìa theo role tác giả.
create or replace function public.delete_my_article(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_article public.articles;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  delete from public.articles where id = p_id and author_id = auth.uid() returning * into v_article;
  if not found then raise exception 'Không thể xóa bài viết này.'; end if;
  insert into public.account_audit_log(actor_user_id, action, metadata)
  values (auth.uid(), 'article_deleted', jsonb_build_object('article_id', v_article.id, 'slug', v_article.slug, 'prior_status', v_article.status));
end;
$$;
revoke all on function public.delete_my_article(uuid) from public, anon;
grant execute on function public.delete_my_article(uuid) to authenticated;

drop policy if exists "NEXORA article cover upload" on storage.objects;
create policy "NEXORA article cover upload" on storage.objects for insert to authenticated
with check (bucket_id = 'nexora-brand-assets' and (storage.foldername(name))[1] = 'articles' and lower(storage.extension(name)) in ('png','jpg','jpeg','webp','svg') and public.can_write_articles());

-- 37. Gallery sản phẩm và xóa đơn theo dạng lưu trữ để bảo toàn đối soát.
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null check (length(trim(image_url)) between 8 and 700 and image_url ~* '^https://'),
  sort_order smallint not null default 0 check (sort_order between 0 and 7),
  created_at timestamptz not null default now(),
  unique (product_id, image_url),
  unique (product_id, sort_order)
);
create index if not exists product_images_product_sort_idx on public.product_images(product_id, sort_order);
alter table public.product_images enable row level security;
revoke all on table public.product_images from public, anon, authenticated;
create policy "Public reads product gallery" on public.product_images for select using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

insert into public.product_images(product_id, image_url, sort_order)
select p.id, p.image_url, 0 from public.products p
where p.image_url ~* '^https://'
on conflict (product_id, image_url) do nothing;

create or replace function public.replace_product_gallery(p_product_id uuid, p_image_urls jsonb)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_url text; v_position integer := 0; v_urls jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Bạn không có quyền quản lý ảnh sản phẩm.'; end if;
  if jsonb_typeof(p_image_urls) <> 'array' or jsonb_array_length(p_image_urls) not between 1 and 8 then raise exception 'Gallery cần từ 1 đến 8 ảnh.'; end if;
  if not exists (select 1 from public.products where id = p_product_id) then raise exception 'Không tìm thấy sản phẩm.'; end if;
  select jsonb_agg(distinct_url order by position) into v_urls from (
    select value as distinct_url, min(ordinality) as position from jsonb_array_elements_text(p_image_urls) with ordinality where value ~* '^https://' and length(trim(value)) between 8 and 700 group by value
  ) compact;
  if v_urls is null or jsonb_array_length(v_urls) <> jsonb_array_length(p_image_urls) then raise exception 'Mỗi ảnh phải là URL HTTPS hợp lệ và không trùng lặp.'; end if;
  delete from public.product_images where product_id = p_product_id;
  for v_url in select value from jsonb_array_elements_text(v_urls) loop
    insert into public.product_images(product_id, image_url, sort_order) values (p_product_id, v_url, v_position);
    v_position := v_position + 1;
  end loop;
  update public.products set image_url = (v_urls ->> 0), updated_at = now() where id = p_product_id;
end;
$$;
revoke all on function public.replace_product_gallery(uuid,jsonb) from public, anon;
grant execute on function public.replace_product_gallery(uuid,jsonb) to authenticated;

alter table public.orders add column if not exists archived_at timestamptz;
alter table public.orders add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists archive_reason text;
alter table public.orders drop constraint if exists orders_archive_reason_check;
alter table public.orders add constraint orders_archive_reason_check check (archive_reason is null or length(trim(archive_reason)) between 1 and 400);

create or replace function public.archive_cancelled_order(p_order_id uuid, p_reason text default null)
returns public.orders language plpgsql security definer set search_path = public, auth
as $$
declare v_order public.orders; v_reason text := coalesce(nullif(trim(p_reason), ''), 'Đơn hủy được lưu trữ khỏi danh sách vận hành.');
begin
  if auth.uid() is null or not public.can_manage_orders() then raise exception 'Bạn không có quyền xóa/lưu trữ đơn.'; end if;
  if length(v_reason) > 400 then raise exception 'Ghi chú lưu trữ tối đa 400 ký tự.'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if v_order.status <> 'cancelled' then raise exception 'Hãy hủy đơn trước khi xóa khỏi danh sách.'; end if;
  if v_order.archived_at is not null then raise exception 'Đơn này đã được lưu trữ.'; end if;
  update public.orders set archived_at = now(), archived_by = auth.uid(), archive_reason = v_reason, updated_at = now() where id = v_order.id returning * into v_order;
  insert into public.account_audit_log(actor_user_id, action, metadata) values (auth.uid(), 'order_archived', jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number));
  return v_order;
end;
$$;
revoke all on function public.archive_cancelled_order(uuid,text) from public, anon;
grant execute on function public.archive_cancelled_order(uuid,text) to authenticated;

drop policy if exists "NEXORA product gallery upload" on storage.objects;
create policy "NEXORA product gallery upload" on storage.objects for insert to authenticated
with check (bucket_id = 'nexora-brand-assets' and (storage.foldername(name))[1] = 'products' and lower(storage.extension(name)) in ('png','jpg','jpeg','webp','svg') and public.is_admin());

-- 38. Admin cần xem gallery của cả sản phẩm đang tạm ngừng bán để chỉnh sửa.
drop policy if exists "Public reads product gallery" on public.product_images;
create policy "Public reads product gallery" on public.product_images for select using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin())));

-- 39. RLS policy không thay thế quyền PostgreSQL: cấp đúng mức đọc/gọi hàm cho UI quản trị.
grant select on table public.product_images to anon, authenticated;
grant execute on function public.can_manage_shipments() to authenticated;
