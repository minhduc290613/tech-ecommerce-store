# Chỉ mục tài liệu NEXORA

Tài liệu này là điểm bắt đầu để tra cứu mã nguồn, vận hành cửa hàng và khôi phục hạ tầng. Các tài liệu được liên kết theo **mục đích sử dụng**, thay vì theo thứ tự tạo file.

| Nhu cầu | Tài liệu | Mô tả |
| --- | --- | --- |
| Hiểu nhanh và chạy project | [README](../README.md) | Công nghệ, lệnh local, build, storefront và Command Deck. |
| Cài đặt và vận hành từ A–Z | [Hướng dẫn public GitHub](HUONG_DAN_A_Z.md) | Hướng dẫn đầy đủ từ clone, Supabase, admin, QR/Zalo, role, article, media, build đến checklist production. |
| Kết nối/cài đặt cơ sở dữ liệu | [Hướng dẫn Supabase](SUPABASE.md) | Schema canonical 24 bảng, RLS, quy trình áp dụng một lần và xác minh. |
| Vận hành tài khoản và số dư | [Account & Wallet](ACCOUNT_WALLET.md) | Sổ cái, nạp tiền Zalo, quản trị khách, RLS và quy trình đối soát. |
| Role, nội dung và affiliate | [Role, Content & Affiliate](ROLE_CONTENT_AFFILIATE.md) | Ma trận role, moderation, article reader, referral 15%, hoàn tiền, CSV và mapping sản phẩm–gian hàng. |
| Cấp quyền Command Deck | [Thiết lập admin](../ADMIN_SETUP.md) | Tạo Supabase Auth user và cấp quyền an toàn, không dùng mật khẩu mặc định. |
| Kiểm kê media GitHub | [Asset Manifest](../ASSET_MANIFEST.md) | Nguồn lưu asset, đường dẫn nhánh `assets` và checksum. |
| Xem định hướng thiết kế | [Design brief](../ideas.md) | Hệ thống Circuit Atelier và những quyết định giao diện. |
| Theo dõi việc còn lại | [Checklist dự án](../todo.md) | Các hạng mục đã hoàn tất và việc cần làm tiếp theo. |
| Xem kết quả kiểm tra UI | [Verification Notes](VERIFICATION_NOTES.md) | Ghi nhận kiểm tra Command Deck trước phát hành. |
| Kiểm tra SQL legacy | [Ghi chú migration cũ](LEGACY_MIGRATIONS.md) | Danh sách 10 migration được thay thế bởi một schema canonical. |

> **Lộ trình dành cho người mới:** đọc [Hướng dẫn public GitHub](HUONG_DAN_A_Z.md), áp dụng `supabase-unified.sql`, cấu hình `client/supabase-config.js`, rồi làm theo Thiết lập admin.

## Quy ước nguồn chuẩn

| Thành phần | Nguồn chuẩn |
| --- | --- |
| Schema Supabase | [`supabase-unified.sql`](../supabase-unified.sql) |
| Media gốc | Nhánh GitHub [`assets/media`](https://github.com/minhduc290613/tech-ecommerce-store/tree/assets/media) |
| Mã ứng dụng và tài liệu | Nhánh GitHub `main` |
| Bản deploy | Media được tham chiếu qua storage URL; không sao chép binary vào `client/public` hoặc `client/src/assets`. |

Các trang điều khoản, bảo mật, giao hàng/đổi trả trong CMS là nội dung khởi tạo cho vận hành. Chủ sở hữu cần có **rà soát pháp lý độc lập** trước khi công bố cho khách hàng thực.
