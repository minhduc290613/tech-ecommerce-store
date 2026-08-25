-- Cho moderator đọc hồ sơ cơ bản để gán role, không cấp truy cập ví/sổ cái.
drop policy if exists "Role managers can read customer profiles" on public.customer_profiles;
create policy "Role managers can read customer profiles" on public.customer_profiles
for select to authenticated using (public.can_manage_roles());
