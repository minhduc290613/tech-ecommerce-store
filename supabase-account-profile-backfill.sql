-- Bổ sung sau nexora_account_wallet cho project đã triển khai.
insert into public.customer_profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do update set email = excluded.email, updated_at = now();

insert into public.wallet_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

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
  update public.customer_profiles
  set account_status = p_status, admin_note = nullif(trim(p_note), ''), updated_at = now()
  where user_id = p_user_id
  returning * into v_profile;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata)
  values (p_user_id, auth.uid(), 'account_status_changed', jsonb_build_object('status', p_status, 'note', p_note));
  return v_profile;
end;
$$;

revoke all on function public.admin_set_account_status(uuid, text, text) from public;
revoke execute on function public.admin_set_account_status(uuid, text, text) from anon;
grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;
