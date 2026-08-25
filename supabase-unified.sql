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
  payment_method text not null default 'vietqr' check (payment_method in ('vietqr', 'momo')),
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

alter table public.products enable row level security;
alter table public.admin_users enable row level security;
alter table public.sale_campaigns enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_pages enable row level security;
alter table public.faqs enable row level security;
alter table public.shops enable row level security;

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
create policy "Public can read active products" on public.products for select using (is_active = true or (auth.role() = 'authenticated' and public.is_admin()));
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
-- 5. DỮ LIỆU KHỞI TẠO: CẬP NHẬT THEO NHU CẦU TRƯỚC KHI VẬN HÀNH THẬT
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
