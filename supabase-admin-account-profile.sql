create or replace function public.admin_update_account_profile(p_user_id uuid, p_display_name text, p_username text)
returns public.customer_profiles language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.customer_profiles;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được chỉnh hồ sơ khách hàng.'; end if;
  if p_username is not null and (length(trim(p_username)) < 3 or trim(p_username) !~ '^[a-zA-Z0-9_.-]+$') then raise exception 'Username chỉ gồm 3–40 ký tự chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.'; end if;
  insert into public.customer_profiles (user_id, email) values (p_user_id, (select email from auth.users where id = p_user_id)) on conflict (user_id) do nothing;
  update public.customer_profiles
  set display_name = nullif(trim(p_display_name), ''), username = nullif(lower(trim(p_username)), ''), updated_at = now()
  where user_id = p_user_id
  returning * into v_profile;
  insert into public.account_audit_log (target_user_id, actor_user_id, action, metadata)
  values (p_user_id, auth.uid(), 'account_profile_updated', jsonb_build_object('display_name', v_profile.display_name, 'username', v_profile.username));
  return v_profile;
end;
$$;

revoke all on function public.admin_update_account_profile(uuid, text, text) from public;
revoke execute on function public.admin_update_account_profile(uuid, text, text) from anon;
grant execute on function public.admin_update_account_profile(uuid, text, text) to authenticated;
