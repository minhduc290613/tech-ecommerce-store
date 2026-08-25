-- NEXORA — Account, wallet and audit migration
-- Áp dụng SAU supabase-unified.sql cho project NEXORA đã tồn tại.

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

create unique index if not exists customer_profiles_username_ci_idx
  on public.customer_profiles (lower(username)) where username is not null;

create table if not exists public.wallet_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12, 0) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('topup', 'admin_credit', 'admin_debit', 'wallet_payment', 'refund')),
  amount numeric(12, 0) not null check (amount <> 0),
  balance_after numeric(12, 0) not null check (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_topup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12, 0) not null check (amount > 0),
  customer_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (length(trim(message)) > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.account_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_created_idx on public.wallet_ledger(user_id, created_at desc);
create index if not exists wallet_topup_requests_status_created_idx on public.wallet_topup_requests(status, created_at desc);
create index if not exists wallet_topup_requests_user_created_idx on public.wallet_topup_requests(user_id, created_at desc);
create index if not exists account_warnings_user_created_idx on public.account_warnings(user_id, created_at desc);
create index if not exists account_audit_target_created_idx on public.account_audit_log(target_user_id, created_at desc);

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('vietqr', 'momo', 'wallet'));

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
  on conflict (user_id) do update set email = excluded.email, updated_at = now()
  returning * into v_profile;
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
  update public.customer_profiles
  set display_name = nullif(trim(p_display_name), ''), username = nullif(lower(trim(p_username)), ''), email = auth.jwt() ->> 'email', updated_at = now()
  where user_id = auth.uid() returning * into v_profile;
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
  insert into public.wallet_topup_requests (user_id, amount, customer_note)
  values (auth.uid(), p_amount, nullif(trim(p_customer_note), '')) returning * into v_request;
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
  insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, note, created_by)
  values (p_user_id, case when p_amount > 0 then 'admin_credit' else 'admin_debit' end, p_amount, v_new_balance, trim(p_note), auth.uid());
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata)
  values (p_user_id, auth.uid(), 'wallet_adjusted', jsonb_build_object('amount', p_amount, 'note', trim(p_note)));
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
    insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, reference_type, reference_id, note, created_by)
    values (v_request.user_id, 'topup', v_request.amount, v_new_balance, 'topup_request', v_request.id, coalesce(nullif(trim(p_note), ''), 'Nạp tiền được duyệt'), auth.uid());
  end if;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata)
  values (v_request.user_id, auth.uid(), concat('topup_', p_decision), jsonb_build_object('request_id', v_request.id, 'amount', v_request.amount));
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
  insert into public.customer_profiles (user_id, email)
  values (p_user_id, (select email from auth.users where id = p_user_id))
  on conflict (user_id) do nothing;
  update public.customer_profiles set account_status = p_status, admin_note = nullif(trim(p_note), ''), updated_at = now() where user_id = p_user_id returning * into v_profile;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata)
  values (p_user_id, auth.uid(), 'account_status_changed', jsonb_build_object('status', p_status, 'note', p_note));
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
  insert into public.wallet_ledger (user_id, entry_type, amount, balance_after, reference_type, reference_id, note, created_by)
  values (auth.uid(), 'wallet_payment', -v_order.total_amount, v_balance, 'order', v_order.id, concat('Thanh toán đơn ', v_order.order_number), auth.uid());
  update public.orders set payment_method = 'wallet', status = 'paid', payment_confirmed_at = now(), payment_confirmation_note = 'Thanh toán bằng số dư NEXORA', updated_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

insert into public.customer_profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do update set email = excluded.email, updated_at = now();

insert into public.wallet_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

revoke all on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid), public.enforce_active_order_account() from public;
revoke execute on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid), public.enforce_active_order_account() from anon;
revoke execute on function public.enforce_active_order_account() from authenticated;
grant execute on function public.ensure_my_account(text, text), public.update_my_account(text, text), public.request_wallet_topup(numeric, text), public.admin_adjust_wallet(uuid, numeric, text), public.review_wallet_topup(uuid, text, text), public.admin_set_account_status(uuid, text, text), public.admin_add_account_warning(uuid, text), public.admin_update_account_profile(uuid, text, text), public.pay_order_with_wallet(uuid) to authenticated;
