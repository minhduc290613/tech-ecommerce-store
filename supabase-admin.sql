-- ============================================================================
-- NEXORA Admin — Phân quyền quản trị Supabase
-- Chạy tệp này SAU khi đã chạy supabase-schema.sql.
-- Không tạo mật khẩu mặc định trong mã nguồn để tránh tài khoản dễ bị chiếm quyền.
-- ============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Hàm kiểm tra vai trò được dùng trong RLS và trang quản trị.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admin có toàn quyền với product catalog.
drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin có thể xem và cập nhật toàn bộ đơn hàng.
drop policy if exists "Admins can manage all orders" on public.orders;
create policy "Admins can manage all orders"
on public.orders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
on public.order_items for select
to authenticated
using (public.is_admin());

-- --------------------------------------------------------------------------
-- CẤP TÀI KHOẢN ADMIN ĐẦU TIÊN
-- 1. Truy cập /admin.html và tạo tài khoản bằng email + mật khẩu mạnh.
-- 2. Thay địa chỉ email bên dưới bằng email vừa tạo rồi chạy riêng câu lệnh này.
-- 3. Đăng nhập lại tại /admin.html.
-- --------------------------------------------------------------------------
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'admin@yourdomain.com'
-- on conflict (user_id) do nothing;

-- Bảo mật: Không thêm email/mật khẩu quản trị cố định trong file public hoặc frontend.
