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
  payment_method text not null default 'vietqr' check (payment_method in ('vietqr', 'momo', 'wallet')),
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

create table if not exists public.site_pages (
  slug text primary key check (slug in ('about', 'terms', 'privacy', 'shipping-returns', 'seller-guide', 'contact')),
  title text not null,
  subtitle text not null default '',
  content text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
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

create or replace function public.ensure_my_account(p_display_name text default null, p_username text default null)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  insert into public.customer_profiles (user_id, display_name, username, email)
  values (auth.uid(), nullif(trim(p_display_name), ''), nullif(lower(trim(p_username)), ''), auth.jwt() ->> 'email')
  on conflict (user_id) do update set email = excluded.email, updated_at = now() returning * into v_profile;
  insert into public.wallet_accounts (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return v_profile;
end;
$$;

create or replace function public.update_my_account(p_display_name text, p_username text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  perform public.ensure_my_account(null, null);
  if p_username is not null and (length(trim(p_username)) < 3 or trim(p_username) !~ '^[a-zA-Z0-9_.-]+$') then raise exception 'Username chỉ gồm 3–40 ký tự chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.'; end if;
  update public.customer_profiles set display_name = nullif(trim(p_display_name), ''), username = nullif(lower(trim(p_username)), ''), email = auth.jwt() ->> 'email', updated_at = now() where user_id = auth.uid() returning * into v_profile;
  return v_profile;
end;
$$;

create or replace function public.request_wallet_topup(p_amount numeric, p_customer_note text default null)
returns public.wallet_topup_requests language plpgsql security definer set search_path = public, auth
as $$
declare v_request public.wallet_topup_requests;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
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
  insert into public.customer_profiles (user_id, email) values (p_user_id, (select email from auth.users where id = p_user_id)) on conflict (user_id) do nothing;
  update public.customer_profiles set account_status = p_status, admin_note = nullif(trim(p_note), ''), updated_at = now() where user_id = p_user_id returning * into v_profile;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata) values (p_user_id, auth.uid(), 'account_status_changed', jsonb_build_object('status', p_status, 'note', p_note));
  return v_profile;
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

insert into public.customer_profiles (user_id, email) select id, email from auth.users on conflict (user_id) do update set email = excluded.email, updated_at = now();
insert into public.wallet_accounts (user_id) select id from auth.users on conflict (user_id) do nothing;
revoke all on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid), public.enforce_active_order_account() from public;
revoke execute on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid), public.enforce_active_order_account() from anon;
revoke execute on function public.enforce_active_order_account() from authenticated;
grant execute on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid) to authenticated;

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
  role text not null default 'customer' check (role in ('customer', 'affiliate', 'marketing', 'order_manager', 'moderator', 'admin')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create or replace function public.can_manage_roles()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_any_role(array['moderator']); $$;

create or replace function public.can_moderate_content()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_any_role(array['moderator']); $$;

create or replace function public.can_manage_orders()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_any_role(array['order_manager']); $$;

create or replace function public.can_write_articles()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_any_role(array['marketing', 'moderator', 'affiliate']); $$;

create or replace function public.can_access_command_deck()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.has_any_role(array['moderator', 'order_manager', 'marketing']); $$;

drop policy if exists "Users can read own special role" on public.user_roles;
create policy "Users can read own special role" on public.user_roles for select to authenticated using (user_id = auth.uid());
drop policy if exists "Role managers can read all roles" on public.user_roles;
create policy "Role managers can read all roles" on public.user_roles for select to authenticated using (public.can_manage_roles());
drop policy if exists "Role managers can read customer profiles" on public.customer_profiles;
create policy "Role managers can read customer profiles" on public.customer_profiles for select to authenticated using (public.can_manage_roles());

create or replace function public.assign_user_role(p_user_id uuid, p_role text, p_note text default null)
returns public.user_roles language plpgsql security definer set search_path = public, auth
as $$
declare v_role public.user_roles; v_current text;
begin
  if not public.can_manage_roles() then raise exception 'Bạn không có quyền quản lý role.'; end if;
  if p_role not in ('customer', 'affiliate', 'marketing', 'order_manager', 'moderator', 'admin') then raise exception 'Role không hợp lệ.'; end if;
  select role into v_current from public.user_roles where user_id = p_user_id;
  if not public.is_admin() and (p_role = 'admin' or v_current = 'admin') then raise exception 'Chỉ admin được thay đổi role admin.'; end if;
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
create policy "Admins can manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.site_settings add column if not exists favicon_url text;
alter table public.site_settings add column if not exists payment_bank_id text;
alter table public.site_settings add column if not exists payment_account_number text;
alter table public.site_settings add column if not exists payment_account_name text;
alter table public.site_settings add column if not exists payment_momo_phone text;
alter table public.site_settings add column if not exists storefront_effect text not null default 'none' check (storefront_effect in ('none','snow','cherry_blossom'));
alter table public.site_settings add column if not exists storefront_effect_color text not null default '#d8f3ff';
alter table public.site_settings add column if not exists storefront_effect_density integer not null default 24 check (storefront_effect_density between 0 and 120);

revoke all on table public.user_roles, public.affiliate_profiles, public.affiliate_referrals, public.affiliate_commissions, public.refund_requests from anon, authenticated;
grant select on table public.user_roles, public.affiliate_profiles, public.affiliate_referrals, public.affiliate_commissions, public.refund_requests to authenticated;
grant select on table public.product_reviews, public.product_comments, public.articles, public.affiliate_program_settings to anon, authenticated;
revoke all on function public.has_role(text), public.has_any_role(text[]), public.can_manage_roles(), public.can_moderate_content(), public.can_manage_orders(), public.can_write_articles(), public.can_access_command_deck(), public.assign_user_role(uuid,text,text), public.submit_product_review(uuid,integer,text), public.submit_product_comment(uuid,text), public.moderate_content(text,uuid,text,text), public.save_my_article(uuid,text,text,text,text,text,boolean), public.request_affiliate_access(), public.review_affiliate(uuid,text,text), public.claim_affiliate_referral(text), public.create_affiliate_commission(), public.attach_affiliate_to_order(), public.request_order_refund(uuid,numeric,text), public.review_refund_request(uuid,text,text,text) from public, anon;
revoke execute on function public.create_affiliate_commission(), public.attach_affiliate_to_order() from authenticated;
grant execute on function public.has_role(text), public.has_any_role(text[]), public.can_manage_roles(), public.can_moderate_content(), public.can_manage_orders(), public.can_write_articles(), public.can_access_command_deck(), public.assign_user_role(uuid,text,text), public.submit_product_review(uuid,integer,text), public.submit_product_comment(uuid,text), public.moderate_content(text,uuid,text,text), public.save_my_article(uuid,text,text,text,text,text,boolean), public.request_affiliate_access(), public.review_affiliate(uuid,text,text), public.claim_affiliate_referral(text), public.request_order_refund(uuid,numeric,text), public.review_refund_request(uuid,text,text,text) to authenticated;

insert into public.affiliate_program_settings (singleton) values (true) on conflict (singleton) do nothing;

-- Liên kết seed catalog với shop tương ứng nhưng không ghi đè mapping admin đã chọn.
update public.products p set shop_id = case p.category
  when 'Điện thoại' then (select id from public.shops where slug = 'nova-mobile' limit 1)
  when 'Laptop' then (select id from public.shops where slug = 'orion-compute' limit 1)
  else (select id from public.shops where slug = 'nexora-select' limit 1)
end where p.shop_id is null;
