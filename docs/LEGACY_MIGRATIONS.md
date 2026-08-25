# Ghi chú migration legacy

Mười SQL file dưới đây được giữ lại để **đối chiếu lịch sử phát triển**, nhưng không còn là đường cài đặt khuyến nghị. Toàn bộ nội dung chức năng của chúng đã được chuẩn hóa vào [`supabase-unified.sql`](../supabase-unified.sql).

| File legacy | Chức năng được gộp |
| --- | --- |
| `supabase-schema.sql` | Catalog gốc, orders, order items, checkout cơ bản và seed. |
| `supabase-admin.sql` | `admin_users`, `is_admin()` và RLS quản trị. |
| `supabase-marketplace-cms.sql` | Branding, site pages, FAQ và gian hàng. |
| `supabase-catalog-admin.sql` | SKU, thương hiệu, bảo hành và trạng thái hiển thị. |
| `supabase-order-operations.sql` | Pipeline giao nhận và dữ liệu dashboard đơn hàng. |
| `supabase-payment-confirmation.sql` | Zalo xác nhận chuyển khoản và cờ thanh toán. |
| `supabase-product-specifications.sql` | JSON thông số kỹ thuật, hotline và nhãn Zalo. |
| `supabase-seller-contact.sql` | CTA liên hệ người bán. |
| `supabase-shop-contact.sql` | Liên hệ Zalo cho từng gian hàng. |
| `supabase-sale-campaigns.sql` | Sale campaign, giảm giá đơn hàng và RPC checkout có mã sale. |

Nếu production đã từng chạy một phần các file legacy, không dán thẳng `supabase-unified.sql` lên database đó. Hãy kiểm tra cấu trúc hiện tại và soạn migration nâng cấp theo chênh lệch để không làm mất dữ liệu.
