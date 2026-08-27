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

Command Deck đã được kiểm tra trực tiếp bằng phiên admin: workspace **Email & Domain** hiển thị cả SMTP trực tiếp, Resend Hook, Postmark Hook và provider khác; mỗi lựa chọn có checklist riêng, không có trường nhập secret. Form email Quên mật khẩu hiển thị nội dung, preview và nút sao chép HTML chứa `{{ .ConfirmationURL }}` cố định.

Kiểm thử tương tác không lưu dữ liệu xác nhận chọn **Resend Hook** cập nhật checklist Edge Function/secret manager tức thì. Khi thay heading trong form mẫu email, preview cập nhật tức thì và không phát sinh ghi dữ liệu cho đến khi admin bấm nút lưu.

Nút **Sao chép HTML Supabase** đã tạo HTML recovery và hiển thị phản hồi thành công; HTML giữ placeholder `{{ .ConfirmationURL }}`. Console sau các thao tác provider, preview và sao chép không có lỗi runtime.

Sau bản sửa login, kiểm tra trực tiếp trong browser xác nhận `#authPassword` còn gắn trong DOM, có `type=password`, không bị disabled/hidden và nhận focus. Nguyên nhân trước đó là bộ dịch ghi đè `textContent` của nhãn chứa input.

Kiểm thử modal đăng nhập bằng giá trị không nhạy cảm `demo-pass-123` xác nhận trường mật khẩu nhận và giữ được dữ liệu, không gửi form hoặc thực hiện đăng nhập thật.

Production đã tái hiện thông báo fallback catalog trong khi sáu sản phẩm dự phòng vẫn hiển thị. Console không có exception runtime; cần truy vấn trực tiếp phản hồi Supabase để xác định lỗi dữ liệu/RLS thay vì lỗi JavaScript.

Truy vấn chỉ đọc production bằng đúng câu lệnh `products.select('*').order('featured').order('created_at')` trả về sáu bản ghi và không có lỗi. Do đó cảnh báo UI là fallback sai/thất bại tải tạm thời lúc khởi động, không phải catalog thiếu dữ liệu hay RLS hiện tại.

Sau khi đặt `hidden` là trạng thái CSS ưu tiên, preview storefront tải sáu sản phẩm thật và không còn render panel “Không thể đồng bộ catalog mới nhất”.

Kiểm thử điều khiển menu xác nhận nút ba gạch mở menu với `aria-expanded=true`, nav không còn hidden và scrim hoạt động; bấm scrim đóng lại, trả `aria-expanded=false` và `hidden=true`. Snapshot 390 px xác nhận khi đóng, header/menu không che hero content.

Luồng thanh toán số dư chỉ tạo URL `/orders.html?paid=wallet&order=…` khi RPC trả đơn có `status=paid` và `payment_method=wallet`; không gọi RPC thanh toán thật trong kiểm thử để tránh thay đổi số dư. Đích Đơn hàng đã tải được với URL này. RPC yêu cầu xác nhận chuyển khoản chỉ ghi `zalo_confirmation_requested_at`, không cập nhật `status=paid`.

Rà soát truy cập Command Deck ghi nhận backend/preview vẫn phục vụ trang; lỗi browser là `refresh_token_not_found` từ Supabase Auth. Luồng admin đã được cập nhật để dọn phiên cũ cục bộ trước khi đăng nhập lại và hiển thị thông báo phục hồi rõ hơn.

Đã xử lý thêm thứ tự sự kiện sign-out: thông báo “phiên cũ không còn hợp lệ” không còn bị callback Supabase ghi đè thành thông báo chung sau khi local session được dọn.

ZaloPay được thêm ở chế độ QR/chuyển khoản thủ công: tab checkout và nhãn VietQR/MoMo/ZaloPay hiển thị đúng trên storefront. Kiểm thử chỉ xác nhận sự hiện diện giao diện/URL HTTPS, không tạo đơn hoặc xác nhận giao dịch tiền thật.

Modal checkout ZaloPay đã được kiểm thử bằng dữ liệu hiển thị giả: khung QR chuyển sang trạng thái tím nổi bật, panel ba bước quét mã hiện đúng, và không có đơn hoặc giao dịch tiền thật nào được tạo.

Kiểm tra trực quan modal QR ZaloPay xác nhận QR, số tiền, mã đơn, ba bước quét và cảnh báo bảo mật cùng hiển thị trong một luồng; console không ghi nhận lỗi runtime sau khi mở trạng thái này.

Modal QR ZaloPay giữ trạng thái cuộn khi nội dung dài, khung QR hiển thị 270px ở desktop và hướng dẫn vẫn có thể truy cập; không phát hiện lỗi console trong kiểm thử giao diện.

Kiểm thử hai nút sao chép trong modal ZaloPay bằng dữ liệu UI giả xác nhận nút **Sao chép nội dung chuyển khoản** ghi đúng mã đơn giả và nút **Sao chép số tài khoản** ghi đúng giá trị giả vào clipboard. Hai nút có nhãn rõ ràng, hiển thị khi QR ZaloPay hợp lệ và không tạo đơn hoặc giao dịch thật.

Ở viewport 390px, hai nút tự xếp một cột, mỗi nút cao 44px và modal không tràn ngang.

CK tự động được kiểm thử bằng module dữ liệu thuần và endpoint trạng thái server: SePay/Casso/VietQR Host2Host chỉ nhận mã đơn NEXORA hợp lệ, giao dịch tiền vào và chữ ký/timestamp hợp lệ. Endpoint Command Deck chỉ trả trạng thái đã/chưa cấu hình, không có secret. Test không gọi nhà cung cấp, không tạo đơn, không chuyển trạng thái thanh toán và không phát sinh giao dịch tiền thật.
