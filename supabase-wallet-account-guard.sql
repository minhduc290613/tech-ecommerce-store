-- Bổ sung sau nexora_account_wallet cho project đã triển khai.
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
create trigger enforce_active_order_account_trigger
before insert on public.orders
for each row execute function public.enforce_active_order_account();

revoke all on function public.enforce_active_order_account() from public;
revoke execute on function public.enforce_active_order_account() from anon;
revoke execute on function public.enforce_active_order_account() from authenticated;
