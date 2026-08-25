-- ============================================================================
-- NEXORA Sale Hunt + Order Discount
-- Chạy SAU supabase-schema.sql và supabase-admin.sql.
-- ============================================================================

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

alter table public.orders
  add column if not exists subtotal_amount numeric(12, 0),
  add column if not exists discount_amount numeric(12, 0) not null default 0 check (discount_amount >= 0),
  add column if not exists sale_campaign_id uuid references public.sale_campaigns(id) on delete set null,
  add column if not exists sale_code text;

update public.orders set subtotal_amount = total_amount where subtotal_amount is null;
alter table public.orders alter column subtotal_amount set not null;
alter table public.orders alter column subtotal_amount set default 0;

create index if not exists sale_campaigns_active_dates_idx on public.sale_campaigns(is_active, starts_at, ends_at);
create index if not exists orders_sale_campaign_idx on public.orders(sale_campaign_id);

alter table public.sale_campaigns enable row level security;

drop policy if exists "Public can read active sale campaigns" on public.sale_campaigns;
create policy "Public can read active sale campaigns"
on public.sale_campaigns for select
using (is_active = true and starts_at <= now() and ends_at >= now());

drop policy if exists "Admins can manage sale campaigns" on public.sale_campaigns;
create policy "Admins can manage sale campaigns"
on public.sale_campaigns for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Giữ API cũ để tránh hỏng các client cũ. Frontend mới gọi hàm có sale code bên dưới.
create or replace function public.create_order_with_sale(
  p_order_number text,
  p_payment_method text,
  p_payment_note text,
  p_sale_code text,
  p_items jsonb
)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders;
  v_product public.products;
  v_campaign public.sale_campaigns;
  v_item jsonb;
  v_quantity integer;
  v_subtotal numeric(12, 0) := 0;
  v_discount numeric(12, 0) := 0;
  v_total numeric(12, 0) := 0;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để tạo đơn hàng.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Giỏ hàng không có sản phẩm hợp lệ.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    if not found then raise exception 'Không tìm thấy sản phẩm trong đơn hàng.'; end if;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Số lượng sản phẩm không hợp lệ.'; end if;
    if v_product.stock < v_quantity then raise exception 'Sản phẩm % không còn đủ tồn kho.', v_product.name; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  if nullif(trim(p_sale_code), '') is not null then
    select * into v_campaign
    from public.sale_campaigns
    where code = upper(trim(p_sale_code)) and is_active = true and starts_at <= now() and ends_at >= now()
    for update;

    if not found then raise exception 'Mã săn sale không hợp lệ hoặc đã hết hạn.'; end if;
    if v_campaign.usage_limit is not null and v_campaign.usage_count >= v_campaign.usage_limit then
      raise exception 'Mã săn sale đã hết lượt sử dụng.';
    end if;
    if v_subtotal < v_campaign.minimum_order_amount then
      raise exception 'Đơn cần tối thiểu % để áp dụng mã này.', v_campaign.minimum_order_amount;
    end if;

    if v_campaign.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_campaign.discount_value / 100);
    else
      v_discount := v_campaign.discount_value;
    end if;
    if v_campaign.maximum_discount_amount is not null then
      v_discount := least(v_discount, v_campaign.maximum_discount_amount);
    end if;
    v_discount := least(v_discount, v_subtotal);
    update public.sale_campaigns set usage_count = usage_count + 1, updated_at = now() where id = v_campaign.id;
  end if;

  v_total := v_subtotal - v_discount;
  insert into public.orders (user_id, order_number, subtotal_amount, discount_amount, total_amount, sale_campaign_id, sale_code, status, payment_method, payment_note)
  values (auth.uid(), p_order_number, v_subtotal, v_discount, v_total, v_campaign.id, nullif(upper(trim(p_sale_code)), ''), 'pending_payment', p_payment_method, p_payment_note)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
    values (v_order.id, v_product.id, v_product.name, v_product.price, v_quantity, v_product.price * v_quantity);
  end loop;
  return v_order;
end;
$$;

grant execute on function public.create_order_with_sale(text, text, text, text, jsonb) to authenticated;

insert into public.sale_campaigns (code, title, description, badge_text, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, starts_at, ends_at, usage_limit, is_active, is_hunt_featured)
values
  ('HUNTCYAN10', 'Săn Sale Cyan 10%', 'Giảm 10% cho đơn từ 3.000.000đ. Ưu đãi giới hạn theo lượt sử dụng.', 'SĂN SALE 10%', 'percent', 10, 3000000, 1000000, now(), now() + interval '30 days', 300, true, true),
  ('TECH500K', 'Tech Deal 500K', 'Giảm trực tiếp 500.000đ cho đơn từ 12.000.000đ.', 'GIẢM 500K', 'fixed', 500000, 12000000, null, now(), now() + interval '30 days', 100, true, false)
on conflict (code) do nothing;
