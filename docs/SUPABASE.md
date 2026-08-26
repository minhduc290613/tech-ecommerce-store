# Quy trình Supabase NEXORA

## Mục tiêu

NEXORA sử dụng một schema canonical duy nhất: [`supabase-unified.sql`](../supabase-unified.sql). File này bao gồm catalog, đơn hàng, RLS, Command Deck, Account Center, CMS/Zalo, thông số kỹ thuật, săn sale, role, moderation, bài viết, affiliate 15%, hoàn tiền, RPC checkout và dữ liệu khởi tạo.

> Repository chỉ giữ `supabase-unified.sql`; không có migration SQL rời để chạy lần lượt.

## Áp dụng sau khi kết nối

| Bước | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Tạo/kết nối Supabase project trống. | Project ở trạng thái hoạt động. |
| 2 | Áp dụng toàn bộ `supabase-unified.sql` như **một migration DDL**. | Tạo 25 bảng public, function/RPC, index, RLS policy, Account Center, role/capability tùy chỉnh, moderation/affiliate/refund và seed. |
| 3 | Bật Email/Password trong Authentication. | Storefront có thể tạo tài khoản/đăng nhập. |
| 4 | Lấy Project URL và anon/publishable key, điền vào `client/supabase-config.js`. | Storefront và `/admin.html` cùng dùng một project. |
| 5 | Tạo user rồi cấp quyền trong `admin_users`. | User mở được Command Deck. |

### Cách áp dụng thủ công

Mở **Supabase Dashboard → SQL Editor**, dán toàn bộ nội dung [`supabase-unified.sql`](../supabase-unified.sql), sau đó chạy một lần trên project mới/trống.

### Áp dụng có quản lý

Khi project Supabase đã được kết nối với môi trường quản lý, schema canonical có thể được áp dụng tự động thành migration `nexora_unified_schema`. Trên project `shopdatabase` đã kết nối cho NEXORA, schema này cùng hai migration hardening kế tiếp (`nexora_security_hardening`, `nexora_revoke_anon_rpc`) đã được áp dụng thành công trong lần chuẩn hóa hiện tại. Với một project mới, phiên bản hiện tại của file unified đã bao gồm các hardening này nên chỉ cần chạy **một file**.

Việc chạy schema là thay đổi DDL: **không chạy lại tùy tiện trên production đã có dữ liệu**. Hãy sao lưu, kiểm tra migration hiện có và chuẩn bị migration nâng cấp riêng nếu schema production đã khác canonical.

Schema canonical hiện hành đã bao gồm RPC chỉnh tỷ lệ affiliate, Realtime moderation và role/capability. Với project đang hoạt động, áp dụng phần chênh lệch qua migration DDL có quản lý, không tạo file SQL rời trong repository.

## Xác minh sau khi áp dụng

| Bảng/module | Số bản ghi khởi tạo mong đợi |
| --- | ---: |
| `products` | 6 |
| `sale_campaigns` | 2 |
| `site_settings` | 1 |
| `site_pages` | 6 |
| `faqs` | 3 |
| `shops` | 3 |
| `admin_users`, `orders`, `order_items`, `user_roles`, moderation, affiliate, refund | 0 |

Toàn bộ **25 bảng public** phải có RLS bật. Dòng seed chỉ có vai trò giúp kiểm thử; hãy thay giá, tồn kho, ảnh, thông số và nội dung pháp lý bằng dữ liệu vận hành thật trước khi mở bán. Seed catalog được liên kết theo `products.shop_id` với ba shop khởi tạo; admin có thể đổi mapping trong biểu mẫu sản phẩm. Xem [Account & Wallet](ACCOUNT_WALLET.md) để vận hành số dư, nạp tiền Zalo và audit log; xem [Role, Content & Affiliate](ROLE_CONTENT_AFFILIATE.md) cho luồng quyền và moderation.

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
