# Vận hành tài khoản, số dư và nạp tiền Zalo

NEXORA quản lý số dư bằng **sổ cái bất biến theo giao dịch**. Không có form sửa trực tiếp giá trị `balance` ở frontend; mọi cộng/trừ được thực hiện bằng RPC có kiểm tra quyền, tạo `wallet_ledger` và `account_audit_log`.

## Phạm vi chức năng

| Nhóm người dùng | Chức năng |
| --- | --- |
| Khách hàng | Cập nhật tên/username, đổi email/mật khẩu, xem số dư, xem sổ cái, gửi yêu cầu nạp và mở Zalo shop. |
| Quản trị viên | Xem khách, khóa/mở tài khoản, cảnh cáo, sửa tên/username, gửi email đặt lại mật khẩu, cộng/trừ số dư, duyệt/từ chối yêu cầu nạp và xem audit log. |
| Database | Áp dụng RLS, kiểm tra `is_admin()`, khóa dòng lúc điều chỉnh số dư và chặn account không active tạo đơn. |

## Luồng nạp tiền qua Zalo

1. Khách vào **Tài khoản & số dư** từ nút profile của storefront, nhập số tiền và ghi chú.
2. Website tạo `wallet_topup_requests` với trạng thái `pending`, sau đó mở Zalo shop để khách gửi mã yêu cầu và thông tin chuyển khoản.
3. Admin đối soát giao dịch ngân hàng thực tế trong Command Deck.
4. Khi admin chọn **Duyệt**, RPC cộng tiền vào `wallet_accounts`, ghi dòng `topup` trong `wallet_ledger`, rồi ghi audit log.
5. Khi từ chối, request được lưu `rejected` cùng lý do và **không** thay đổi số dư.

> Không đánh dấu yêu cầu nạp là đã duyệt chỉ dựa trên ảnh chụp hoặc nội dung tin nhắn. Phải đối soát giao dịch nhận tiền thực tế trước khi cộng số dư.

## Điều chỉnh số dư

| Thao tác | Giá trị nhập | Kết quả |
| --- | ---: | --- |
| Cộng thủ công | Số dương | Dòng `admin_credit` trong sổ cái. |
| Trừ thủ công | Số âm | Dòng `admin_debit`; database từ chối nếu số dư thành âm. |
| Thanh toán đơn | Hệ thống tự trừ | Dòng `wallet_payment`, đơn chuyển `paid`. |
| Duyệt nạp | Hệ thống tự cộng | Dòng `topup`, liên kết mã yêu cầu nạp. |

Admin phải nhập lý do cho mọi cộng/trừ thủ công. Để hoàn tiền, ưu tiên ghi một dòng `refund`/cộng có ghi chú rõ thay vì xóa lịch sử cũ.

## Kiểm thử đã xác nhận

Luồng điều chỉnh số dư đã được kiểm thử bằng một khoản cộng **1.000 ₫**, xác nhận có dòng sổ cái và audit log, rồi trừ hoàn tác đúng **1.000 ₫**. Số dư cuối cùng trở về **0 ₫** và hai chứng từ vẫn được giữ để đối soát. Không sử dụng dữ liệu này làm bằng chứng đã nhận tiền thực tế.

## Quản lý trạng thái và mật khẩu

`active` cho phép khách tạo đơn và thanh toán bằng số dư. `suspended` hoặc `banned` chặn tạo đơn mới; mọi thay đổi trạng thái tạo audit log. Admin không nhìn thấy hoặc đặt mật khẩu khách trực tiếp. Nút **email đặt lại mật khẩu** gửi link của Supabase Auth đến email khách; khách tự đặt mật khẩu mới theo luồng an toàn.

Khách tự đổi email/mật khẩu trong Account Center. Nếu Supabase bật xác nhận email ở tương lai, hãy cấu hình URL redirect và SMTP production trước khi dùng luồng email.[1]

## Schema và migration

| Tình trạng database | File cần dùng |
| --- | --- |
| Project Supabase mới/trống | [`../supabase-unified.sql`](../supabase-unified.sql). |
| Project NEXORA đã có schema canonical | `supabase-account-wallet.sql`, `supabase-wallet-account-guard.sql`, `supabase-account-profile-backfill.sql`, rồi `supabase-admin-account-profile.sql` theo lịch sử migration đã áp dụng. |

Các RPC `SECURITY DEFINER` trong module này được gọi bởi role `authenticated`, nhưng từng hàm kiểm tra `auth.uid()` hoặc `is_admin()` trước khi thao tác. Không cấp `service_role key` cho trình duyệt và không tắt RLS để xử lý lỗi nhanh.

## References

[1] [Supabase — Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
