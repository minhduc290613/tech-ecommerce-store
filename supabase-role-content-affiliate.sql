-- ============================================================================
-- NEXORA — Role, nội dung, affiliate, hoàn tiền và CMS mở rộng
-- Chạy MỘT LẦN sau các migration NEXORA hiện có trên project đã vận hành.
-- Với project mới, các khối tương đương được đưa vào supabase-unified.sql.
-- ============================================================================

-- 1) Role và ma trận quyền
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
  select case
    when p_role = 'admin' then public.is_admin()
    else exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role)
  end;
$$;

create or replace function public.has_any_role(p_roles text[])
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select public.is_admin() or exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = any(p_roles)
  );
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

-- 2) Review, bình luận và bài viết
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
  if p_type = 'review' then update public.product_reviews set status = p_status, moderation_note = nullif(trim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = p_id;
  elsif p_type = 'comment' then update public.product_comments set status = p_status, moderation_note = nullif(trim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = p_id;
  else update public.articles set status = case when p_status = 'approved' then 'published' else p_status end, reviewed_by = auth.uid(), reviewed_at = now(), published_at = case when p_status in ('approved','published') then coalesce(published_at, now()) else published_at end, updated_at = now() where id = p_id;
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
  if p_id is null then insert into public.articles (slug, title, excerpt, content, cover_image_url, author_id, status) values (trim(p_slug), trim(p_title), trim(coalesce(p_excerpt, '')), trim(p_content), nullif(trim(p_cover_image_url), ''), auth.uid(), v_status) returning * into v_article;
  else
    update public.articles set slug = trim(p_slug), title = trim(p_title), excerpt = trim(coalesce(p_excerpt, '')), content = trim(p_content), cover_image_url = nullif(trim(p_cover_image_url), ''), status = case when status = 'published' and not public.can_moderate_content() then status else v_status end, updated_at = now() where id = p_id and author_id = auth.uid() returning * into v_article;
    if not found then raise exception 'Không thể sửa bài viết này.'; end if;
  end if;
  return v_article;
end;
$$;

-- 3) Affiliate: link giới thiệu, duyệt điều kiện và hoa hồng 15%
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

alter table public.orders add column if not exists affiliate_user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_affiliate_user_idx on public.orders(affiliate_user_id, created_at desc);
alter table public.wallet_ledger drop constraint if exists wallet_ledger_entry_type_check;
alter table public.wallet_ledger add constraint wallet_ledger_entry_type_check check (entry_type in ('topup', 'admin_credit', 'admin_debit', 'wallet_payment', 'refund', 'affiliate_commission'));

create or replace function public.attach_affiliate_to_order()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if new.affiliate_user_id is null then
    select affiliate_user_id into new.affiliate_user_id from public.affiliate_referrals where referred_user_id = new.user_id;
  end if;
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

-- 4) Hoàn tiền và liên kết sản phẩm/gian hàng
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

-- RLS cho dữ liệu role mới và quyền vận hành đơn/hoàn tiền
drop policy if exists "Admins can manage all orders" on public.orders;
create policy "Order managers can manage all orders" on public.orders for all to authenticated using (public.can_manage_orders()) with check (public.can_manage_orders());
drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Order managers can read all order items" on public.order_items for select to authenticated using (public.can_manage_orders());
drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5) CMS cấu hình payment, favicon và hiệu ứng storefront
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

-- Quyền thực thi: chỉ authenticated gọi các RPC; anon không gọi được.
revoke all on function public.has_role(text), public.has_any_role(text[]), public.can_manage_roles(), public.can_moderate_content(), public.can_manage_orders(), public.can_write_articles(), public.can_access_command_deck(), public.assign_user_role(uuid,text,text), public.submit_product_review(uuid,integer,text), public.submit_product_comment(uuid,text), public.moderate_content(text,uuid,text,text), public.save_my_article(uuid,text,text,text,text,text,boolean), public.request_affiliate_access(), public.review_affiliate(uuid,text,text), public.claim_affiliate_referral(text), public.create_affiliate_commission(), public.attach_affiliate_to_order(), public.request_order_refund(uuid,numeric,text), public.review_refund_request(uuid,text,text,text) from public, anon;
revoke execute on function public.create_affiliate_commission(), public.attach_affiliate_to_order() from authenticated;
grant execute on function public.has_role(text), public.has_any_role(text[]), public.can_manage_roles(), public.can_moderate_content(), public.can_manage_orders(), public.can_write_articles(), public.can_access_command_deck(), public.assign_user_role(uuid,text,text), public.submit_product_review(uuid,integer,text), public.submit_product_comment(uuid,text), public.moderate_content(text,uuid,text,text), public.save_my_article(uuid,text,text,text,text,text,boolean), public.request_affiliate_access(), public.review_affiliate(uuid,text,text), public.claim_affiliate_referral(text), public.request_order_refund(uuid,numeric,text), public.review_refund_request(uuid,text,text,text) to authenticated;

insert into public.affiliate_program_settings (singleton) values (true) on conflict (singleton) do nothing;
