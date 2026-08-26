# Xác minh mobile và email URL

Ngày kiểm tra: **26/08/2026**.

| Phạm vi | Kết quả |
| --- | --- |
| Storefront tại 390 × 844 | Header, tìm kiếm, giỏ hàng, menu và shortcut tài khoản hiển thị vừa khung; hero giữ CTA có vùng chạm rõ ràng. |
| Đơn hàng tại 390 × 844 | Tiêu đề, số đơn, thẻ trạng thái và CTA Zalo xếp dọc, không có tràn ngang ở vùng đầu trang. |
| Command Deck tại 390 × 844 | Điều hướng đổi sang dải cuộn ngang có icon kèm nhãn; workspace có thể truy cập thay vì chỉ dựa vào icon. |
| URL email Auth | Helper chỉ chấp nhận HTTPS public; `localhost`, preview và HTTP được fallback về domain production. |

Không gửi email thật trong lần kiểm tra này vì SMTP/provider secret chưa được cấu hình. Cần hoàn tất Site URL, Redirect URLs và SMTP/Send Email Hook trong Supabase Dashboard trước khi xác minh mailbox thực tế.

Kiểm tra trực tiếp trong Command Deck bằng tài khoản admin đã xác nhận workspace **Email & Domain** hiển thị fallback production, form metadata SMTP không có trường mật khẩu/API key và checklist Supabase Auth. Workspace **Tài khoản & số dư** hiển thị nút gửi reset password và đóng/ẩn danh hóa có xác nhận cho từng khách. Browser console không phát sinh lỗi trong các thao tác xem workspace này.

Kiểm tra recovery UI với callback `/?recovery=1` trên phiên đã xác thực xác nhận modal tự mở đúng chế độ đặt mật khẩu mới, chỉ hiển thị hai trường mật khẩu, có kiểm tra khớp/độ dài trước khi gọi cập nhật và dùng mô tả riêng cho phiên recovery. Không gửi email hoặc đổi mật khẩu thật trong bài kiểm tra giao diện này.

Kiểm tra callback lỗi `?recovery=1&error=access_denied&error_code=otp_expired` xác nhận URL được dọn về `/`, modal chuyển sang **Quên mật khẩu**, người dùng có thể nhập email để xin link mới và nhận thông báo lỗi rõ ràng. Console không có lỗi runtime. Cơ chế này dựa trên tham số lỗi callback, không dùng timeout đoán trạng thái phiên.
