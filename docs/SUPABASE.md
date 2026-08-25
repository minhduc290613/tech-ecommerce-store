# Quy trình Supabase NEXORA

## Mục tiêu

NEXORA sử dụng một schema canonical duy nhất: [`supabase-unified.sql`](../supabase-unified.sql). File này bao gồm catalog, đơn hàng, RLS, Command Deck, CMS, Zalo, thông số kỹ thuật, săn sale, RPC checkout và dữ liệu khởi tạo.

> Không chạy tiếp 10 migration rời sau khi đã chạy schema canonical. Các file cũ chỉ được giữ để đối chiếu lịch sử.

## Áp dụng sau khi kết nối

| Bước | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Tạo/kết nối Supabase project trống. | Project ở trạng thái hoạt động. |
| 2 | Áp dụng toàn bộ `supabase-unified.sql` như **một migration DDL**. | Tạo 9 bảng public, function/RPC, index, RLS policy và seed. |
| 3 | Bật Email/Password trong Authentication. | Storefront có thể tạo tài khoản/đăng nhập. |
| 4 | Lấy Project URL và anon/publishable key, điền vào `client/supabase-config.js`. | Storefront và `/admin.html` cùng dùng một project. |
| 5 | Tạo user rồi cấp quyền trong `admin_users`. | User mở được Command Deck. |

### Cách áp dụng thủ công

Mở **Supabase Dashboard → SQL Editor**, dán toàn bộ nội dung [`supabase-unified.sql`](../supabase-unified.sql), sau đó chạy một lần trên project mới/trống.

### Áp dụng có quản lý

Khi project Supabase đã được kết nối với môi trường quản lý, schema canonical có thể được áp dụng tự động thành migration `nexora_unified_schema`. Trên project `shopdatabase` đã kết nối cho NEXORA, schema này cùng hai migration hardening kế tiếp (`nexora_security_hardening`, `nexora_revoke_anon_rpc`) đã được áp dụng thành công trong lần chuẩn hóa hiện tại. Với một project mới, phiên bản hiện tại của file unified đã bao gồm các hardening này nên chỉ cần chạy **một file**.

Việc chạy schema là thay đổi DDL: **không chạy lại tùy tiện trên production đã có dữ liệu**. Hãy sao lưu, kiểm tra migration hiện có và chuẩn bị migration nâng cấp riêng nếu schema production đã khác canonical.

## Xác minh sau khi áp dụng

| Bảng/module | Số bản ghi khởi tạo mong đợi |
| --- | ---: |
| `products` | 6 |
| `sale_campaigns` | 2 |
| `site_settings` | 1 |
| `site_pages` | 6 |
| `faqs` | 3 |
| `shops` | 3 |
| `admin_users`, `orders`, `order_items` | 0 |

Toàn bộ 9 bảng public phải có RLS bật. Dòng seed chỉ có vai trò giúp kiểm thử; hãy thay giá, tồn kho, ảnh, thông số và nội dung pháp lý bằng dữ liệu vận hành thật trước khi mở bán.

## Kiểm soát checkout

`create_order_with_sale` là RPC `SECURITY DEFINER` có kiểm tra `auth.uid()` ngay trong transaction để khóa giá, tồn kho và quota campaign ở database. Quyền thực thi được **thu hồi khỏi vai trò `anon`** và chỉ cấp cho `authenticated`; kiểm tra sau hardening đã xác nhận `anon_can_execute = false` và `authenticated_can_execute = true`.

## Cấp quyền admin an toàn

Sau khi user đăng ký, chạy riêng câu lệnh dưới đây trong SQL Editor, thay email ví dụ bằng email của người quản trị.

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@yourdomain.com'
on conflict (user_id) do nothing;
```

Không thêm mật khẩu admin cố định, `service_role key`, số tài khoản thanh toán thật hoặc bí mật khác vào GitHub/frontend.
