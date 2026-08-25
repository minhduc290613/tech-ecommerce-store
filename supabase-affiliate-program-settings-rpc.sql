-- NEXORA — Cập nhật cấu hình affiliate chỉ dành cho admin.
-- Chạy một lần sau supabase-role-content-affiliate.sql trên project đã vận hành.
create or replace function public.admin_update_affiliate_program(
  p_active boolean,
  p_commission_rate numeric,
  p_min_delivered_orders integer,
  p_min_delivered_amount numeric,
  p_requires_approval boolean
)
returns public.affiliate_program_settings
language plpgsql security definer set search_path = public, auth
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
  insert into public.account_audit_log (actor_user_id, action, metadata)
  values (auth.uid(), 'affiliate_program_updated', jsonb_build_object('active', p_active, 'commission_rate', p_commission_rate, 'min_delivered_orders', p_min_delivered_orders, 'min_delivered_amount', p_min_delivered_amount, 'requires_approval', p_requires_approval));
  return v_settings;
end;
$$;

revoke all on function public.admin_update_affiliate_program(boolean,numeric,integer,numeric,boolean) from public, anon;
grant execute on function public.admin_update_affiliate_program(boolean,numeric,integer,numeric,boolean) to authenticated;
