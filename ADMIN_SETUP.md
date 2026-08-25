# Thiết lập NEXORA Command Deck

Trang quản trị được phục vụ tại **`/admin.html`**. Nó không có mật khẩu mặc định hoặc tài khoản admin hard-code, nhằm tránh việc bất kỳ ai biết mã nguồn đều có thể chiếm quyền quản trị cửa hàng.

| Bước | Thao tác |
| --- | --- |
| 1 | Điền **Project URL** và **anon public key** của Supabase vào `client/supabase-config.js`. Đây là một cấu hình dùng chung cho storefront và trang quản trị. |
| 2 | Trên project mới/trống, chạy một lần [`supabase-unified.sql`](supabase-unified.sql) trong Supabase SQL Editor. File này tạo `admin_users`, hàm kiểm tra quyền, RLS và toàn bộ module cửa hàng. |
| 3 | Không chạy thêm các SQL migration rời sau schema canonical; xem [hướng dẫn Supabase](docs/SUPABASE.md) khi database đã có dữ liệu. |
| 4 | Tạo một tài khoản bằng email/mật khẩu mạnh ở storefront thông qua nút **Đăng nhập → Đăng ký**. |
| 5 | Thay email trong câu lệnh mẫu cuối `supabase-unified.sql`, chạy riêng câu lệnh đó để cấp quyền admin cho đúng tài khoản. |
| 6 | Đăng nhập tại `/admin.html`. |

> Chỉ sử dụng **anon public key** ở các file frontend. Không bao giờ đưa `service_role key` vào mã trình duyệt hoặc commit key này vào repository.

Sau khi truy cập thành công, admin có thể xem tổng quan vận hành, thêm/sửa/xóa sản phẩm, theo dõi đơn hàng và cập nhật trạng thái đơn. Supabase RLS là lớp kiểm soát chính: giao diện không đủ điều kiện để tự cấp quyền quản trị.
