-- Hàm trigger chỉ được PostgreSQL gọi trong lifecycle đơn hàng, không mở RPC cho user.
revoke execute on function public.attach_affiliate_to_order() from authenticated;
revoke execute on function public.create_affiliate_commission() from authenticated;
