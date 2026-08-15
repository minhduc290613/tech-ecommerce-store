-- ============================================================================
-- NEXORA Tech Store — Supabase SQL Schema
-- Dán TOÀN BỘ tệp này vào Supabase SQL Editor rồi bấm Run.
-- Schema gồm: products, orders, order_items + Row Level Security (RLS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- Xóa các bảng cũ chỉ khi bạn muốn cài lại từ đầu.
-- drop table if exists public.order_items;
-- drop table if exists public.orders;
-- drop table if exists public.products;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null check (category in ('Điện thoại', 'Laptop', 'Phụ kiện')),
  description text not null,
  image_url text not null,
  price numeric(12, 0) not null check (price >= 0),
  original_price numeric(12, 0) not null check (original_price >= price),
  stock integer not null default 0 check (stock >= 0),
  is_sale boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  total_amount numeric(12, 0) not null check (total_amount >= 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'processing', 'completed', 'cancelled')),
  payment_method text not null default 'vietqr'
    check (payment_method in ('vietqr', 'momo')),
  payment_note text,
  created_at timestamptz not null default now()
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

create index if not exists products_category_idx on public.products(category);
create index if not exists products_sale_idx on public.products(is_sale);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Bật RLS: khách có thể đọc catalog; chỉ người dùng đã đăng nhập mới tạo/xem đơn của họ.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
on public.products for select
using (true);

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
on public.orders for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
on public.orders for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
on public.order_items for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own order items" on public.order_items;
create policy "Users can create own order items"
on public.order_items for insert
to authenticated
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

-- Sáu sản phẩm mẫu. Bạn có thể thay image_url bằng link Supabase Storage của mình.
insert into public.products
  (name, slug, category, description, image_url, price, original_price, stock, is_sale, featured)
values
  (
    'NEXORA Photon X Pro 256GB',
    'nexora-photon-x-pro-256gb',
    'Điện thoại',
    'Màn hình OLED 6.7 inch 120Hz, camera 50MP, vi xử lý flagship và sạc nhanh 80W.',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85',
    20990000, 24990000, 18, true, true
  ),
  (
    'Orion Book Air 14',
    'orion-book-air-14',
    'Laptop',
    'Laptop 14 inch mỏng nhẹ, chip hiệu năng cao, RAM 16GB, SSD 512GB cho công việc linh hoạt.',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85',
    18990000, 22990000, 12, true, true
  ),
  (
    'Pulse Buds ANC',
    'pulse-buds-anc',
    'Phụ kiện',
    'Tai nghe không dây chống ồn chủ động, âm thanh không gian và pin sử dụng đến 30 giờ.',
    'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85',
    1490000, 2190000, 40, true, true
  ),
  (
    'Vertex Phone S 128GB',
    'vertex-phone-s-128gb',
    'Điện thoại',
    'Thiết kế titan bền bỉ, camera kép linh hoạt, pin cả ngày và màn hình sáng ngoài trời.',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85',
    14990000, 16990000, 25, true, false
  ),
  (
    'Apex Station 16',
    'apex-station-16',
    'Laptop',
    'Laptop hiệu năng sáng tạo với màn hình 16 inch, RAM 32GB, SSD 1TB và card đồ họa rời.',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85',
    32990000, 32990000, 8, false, false
  ),
  (
    'NEXORA Flux 65 Mechanical',
    'nexora-flux-65-mechanical',
    'Phụ kiện',
    'Bàn phím cơ 65% kết nối ba chế độ, switch tuyến tính và đèn nền RGB tùy biến.',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85',
    1690000, 2490000, 32, true, false
  )
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  image_url = excluded.image_url,
  price = excluded.price,
  original_price = excluded.original_price,
  stock = excluded.stock,
  is_sale = excluded.is_sale,
  featured = excluded.featured,
  updated_at = now();

-- Gợi ý: Trong Supabase Dashboard > Authentication > Providers, hãy bật Email.
-- Nếu muốn đăng nhập ngay sau đăng ký khi test, tắt Confirm email ở Authentication > Providers > Email.
