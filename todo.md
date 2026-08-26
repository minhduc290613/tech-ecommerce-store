# Checklist sửa lỗi — NEXORA Tech Store

- [x] Kiểm tra lỗi runtime và console của storefront.
- [x] Kiểm tra các điểm lỗi tiềm ẩn trong app.js, đặc biệt là Supabase và QR thanh toán.
- [x] Sửa lỗi đã xác nhận và bảo đảm cấu hình chưa điền không gây trải nghiệm sai lệch.
- [x] Build lại, kiểm tra giao diện và lưu phiên bản sửa lỗi.

## Khôi phục production

- [x] Kiểm tra HTTP, console và asset của trang chủ production.
- [x] Xác định thay đổi gây lỗi và áp dụng cách khôi phục an toàn.
- [x] Xác minh trang chủ trên production sau khi khắc phục.

## Trang quản trị

- [x] Thiết kế quyền admin và chính sách RLS phù hợp với Supabase.
- [x] Mở rộng SQL schema bằng bảng admin, chính sách quyền và script cấp admin.
- [x] Xây dựng trang quản trị sản phẩm và đơn hàng có kiểm soát truy cập.
- [x] Kiểm thử giao diện quản trị và soạn hướng dẫn tạo admin an toàn.

## Tài liệu dự án

- [x] Tổng hợp cấu trúc source, các SQL script và các cấu hình cần thiết.
- [x] Viết README hướng dẫn cài đặt, cấu hình, vận hành và khắc phục lỗi cơ bản.
- [x] Lưu README vào phiên bản production.

## Tương thích static hosting

- [x] Kiểm tra entrypoint index.html hiện có và output build.
- [x] Thêm index.html ở root repository để host tĩnh tự nhận diện storefront.
- [x] Xác nhận build vẫn tạo đúng storefront và trang quản trị.

## Mở rộng nội dung sàn và CMS

- [x] Xác định các trang nội dung, quy trình bán hàng và mô hình CMS phù hợp.
- [x] Thêm schema Supabase cho cài đặt site, FAQ, nội dung pháp lý và gian hàng.
- [x] Xây dựng trang nội dung, FAQ, bảo mật, điều khoản và danh mục gian hàng.
- [x] Mở rộng Command Deck để quản trị nhận diện, banner, FAQ và nội dung sàn.
- [x] Kiểm thử các trang và hướng dẫn vận hành phần quản trị nội dung.

## Quản lý catalog

- [x] Rà soát biểu mẫu hiện tại và bổ sung các trường thông tin sản phẩm cần thiết.
- [x] Hoàn thiện tạo mới, chỉnh sửa, xóa và hiển thị preview ảnh sản phẩm.
- [x] Kiểm thử build và luồng quản lý catalog trong Command Deck.

## Trạng thái bán hàng

- [x] Xác định quy tắc bán, ngừng bán và hết hàng cho storefront.
- [x] Thêm điều khiển trạng thái nhanh trong Command Deck và biểu mẫu sản phẩm.
- [x] Kiểm thử phản ánh trạng thái trên catalog và giỏ hàng.

## Vận hành đơn hàng và doanh thu

- [x] Xác định chỉ số doanh thu, phân loại trạng thái giao hàng và thông tin đơn cần chỉnh sửa.
- [x] Mở rộng schema đơn hàng bằng thông tin khách/giao nhận và trạng thái fulfillment.
- [x] Xây dựng dashboard biểu đồ, bộ lọc đơn và trình chỉnh sửa đơn hàng.
- [x] Kiểm thử build và luồng quản trị đơn hàng.

## Xác nhận chuyển khoản Zalo

- [x] Thiết kế thông điệp xác nhận, thông tin Zalo shop và trạng thái thanh toán.
- [x] Thêm trường cấu hình Zalo và migration trạng thái xác nhận thanh toán.
- [x] Bổ sung nút nhắn Zalo sau checkout và điều khiển đã/chưa thanh toán cho admin.
- [x] Kiểm thử build cùng luồng thanh toán cập nhật.

## Thông số kỹ thuật & liên hệ

- [x] Xác định cấu trúc thông số CPU/chip/RAM/ổ cứng và dữ liệu liên hệ cần hiển thị.
- [x] Thêm migration thông số kỹ thuật và trường liên hệ vào CMS/admin.
- [x] Hiển thị thông số kỹ thuật trong catalog/quick view cùng liên hệ Zalo chân trang.
- [x] Kiểm thử build và luồng chỉnh sửa dữ liệu mở rộng.

## Liên hệ người bán

- [x] Xác định CTA liên hệ người bán và dữ liệu Zalo có thể cấu hình.
- [x] Thêm liên kết Zalo người bán trên storefront và trường chỉnh sửa trong Command Deck.
- [x] Kiểm thử liên kết người bán trên website gốc.

## Săn sale & ưu đãi đơn hàng

- [x] Thiết kế quy tắc chương trình sale, mã giảm giá và điều kiện áp dụng theo đơn.
- [x] Thêm migration chương trình sale và dữ liệu giảm giá cho orders.
- [x] Xây dựng giao diện săn sale, nhập mã ưu đãi và quản trị sale trong Command Deck.
- [x] Kiểm thử tính giá ưu đãi, tạo đơn và thao tác quản trị sale.

## Khắc phục thông số và gian hàng

- [x] Xác định nguyên nhân thông số kỹ thuật không hiển thị trên storefront.
- [x] Sửa renderer thông số và hoàn thiện card gian hàng cùng trường quản trị tương ứng.
- [x] Kiểm thử storefront và Command Deck sau khắc phục.

## Chuẩn hóa GitHub, Supabase và tài liệu

- [x] Rà soát asset, SQL migration, Markdown và cấu hình GitHub/Supabase hiện có.
- [x] Gom asset đã dùng vào repository và hợp nhất các SQL migration.
- [x] Tạo mục lục Markdown và quy trình áp dụng schema Supabase sau khi kết nối.
- [x] Kiểm thử cấu trúc, đồng bộ GitHub và xác nhận bản phát hành.

## Xác thực email Supabase

- [x] Khôi phục quyền truy cập Supabase Dashboard hoặc xác định kênh cấu hình thay thế.
- [x] Tắt yêu cầu xác nhận email cho đăng ký tài khoản (`mailer_autoconfirm = true`).
- [x] Kiểm thử thực tế đăng ký và đăng nhập Supabase ngay không cần email confirm; đã dọn dẹp tài khoản dùng một lần sau test.

## Hướng dẫn public trên GitHub

- [x] Soạn hướng dẫn triển khai, kết nối và vận hành NEXORA từ A–Z.
- [x] Rà soát để không công khai secret, tài khoản hay dữ liệu nhạy cảm.
- [x] Liên kết hướng dẫn mới vào chỉ mục tài liệu và README.

## Quản lý tài khoản, ví và thông báo

- [x] Cấp quyền Command Deck cho minhduc290613@outlook.com sau khi xác minh tài khoản Supabase.
- [x] Gỡ Telegram Bot, webhook và tài liệu/secret liên quan theo yêu cầu mới.
- [x] Khắc phục module tài khoản không hiển thị trên Command Deck sau nâng cấp backend.
- [x] Thiết kế profile, trạng thái tài khoản, cảnh cáo và sổ cái số dư có audit log.
- [x] Thêm quản trị khóa/mở khóa, cảnh cáo, điều chỉnh số dư và duyệt yêu cầu nạp tiền.
- [x] Thêm khu vực tài khoản khách: hồ sơ, đổi email/mật khẩu, số dư và yêu cầu nạp Zalo.
- [x] Kiểm thử RLS, build, route Command Deck và tài liệu vận hành.
- [x] Kiểm thử thủ công luồng điều chỉnh số dư bằng tài khoản admin và khách thật: cộng/trừ 1.000 ₫, kiểm tra sổ cái/audit log, hoàn tác về 0 ₫.

## Role, nội dung, affiliate và vận hành mở rộng

- [x] Rà soát yêu cầu từ ảnh và xác nhận mô hình role/quyền theo từng chức năng.
- [x] Thêm phân quyền admin, moderator, order manager, marketing và affiliate có audit log.
- [x] Hoàn thiện bài viết cho marketing/moderator/admin/affiliate bằng trang đọc đầy đủ, cùng bình luận–đánh giá có kiểm duyệt.
- [x] Thêm điều kiện affiliate, link giới thiệu và hoa hồng 15% theo đơn đủ điều kiện.
- [x] Hoàn thiện bộ lọc thông số kỹ thuật, gán sản phẩm–gian hàng có quản trị và xác minh luồng hoàn tiền.
- [x] Thêm cấu hình thanh toán/Zalo, xuất CSV và CMS điều khiển nhận diện/hiệu ứng storefront.
- [x] Đồng bộ module role/content/affiliate/refund vào schema canonical và kiểm thử đầu-cuối role, moderation, hoa hồng, hoàn tiền, CSV.
- [x] Thêm cấu hình admin cho tỷ lệ hoa hồng affiliate, điều kiện đơn delivered và yêu cầu duyệt; kiểm thử thay đổi 12,5% rồi khôi phục 15%.
- [x] Kiểm thử E2E comment: tạo fixture pending, ẩn bằng moderation, xác nhận reviewed_by/reviewed_at và dọn fixture/audit; không tạo review/rating giả.
- [x] Hoãn kiểm thử E2E review thật theo xác nhận người dùng ngày 25/08/2026; guard review, UI và moderation chung đã được kiểm tra, còn review thật sẽ xác minh khi có khách đã nhận hàng gửi nội dung.
- [x] Kiểm thử trực tiếp RPC tạo bài với toàn bộ role marketing, moderator, admin và affiliate bằng draft kỹ thuật có thu dọn.
- [x] Hiển thị nút bình luận dễ tìm từ thẻ sản phẩm và/hoặc Quick View, mở đúng khu vực gửi bình luận có trạng thái pending.
- [x] Bổ sung thao tác đăng xuất rõ ràng trong Account Center và xác minh session Supabase được kết thúc đúng.
- [x] Kiểm thử E2E bình luận kỹ thuật trung tính: pending → hidden, có reviewed_by/reviewed_at và dọn fixture/audit.
- [x] Kiểm thử đăng xuất Supabase với tài khoản disposable: xác minh session bị xóa, rồi dọn tài khoản test.
- [x] Mở rộng chứng cứ fixture bình luận: ghi nhận trạng thái pending ban đầu và xác nhận audit moderation bị dọn.
- [x] Hiển thị thông báo/badge trong Command Deck khi có bình luận hoặc đánh giá mới ở trạng thái chờ duyệt.
- [x] Cho phép mở thẳng workspace kiểm duyệt từ thông báo và kiểm thử cập nhật số lượng chờ xử lý.
- [x] Mở rộng Realtime moderation để bắt cả UPDATE chuyển review/bình luận sang `pending`, không chỉ INSERT.
- [x] Kiểm thử E2E notification với comment kỹ thuật `UPDATE → pending`, xác nhận badge/notice tăng rồi giảm sau moderation; unit test xác nhận cùng payload review upsert mà không tạo review/rating giả.
- [x] Sửa menu ba gạch mobile để mở/đóng điều hướng storefront rõ ràng, có thể dùng bàn phím và không che nội dung.
- [x] Mở rộng Command Deck để admin chỉnh nhanh nhận diện và CMS: tên website, mô tả SEO, logo, favicon/icon, banner, nội dung giới thiệu/liên hệ/cấu hình có thể vận hành.
- [x] Thêm quản trị role chỉ dành cho admin: tạo role tùy chỉnh, đổi tên, xóa role an toàn và chỉnh capability; moderator chỉ dùng quyền đã được cấp.
- [x] Chuẩn hóa nhãn khu vực CSV thành “Xuất CSV”.
- [x] Hợp nhất toàn bộ SQL dự án về một file canonical duy nhất, cập nhật tài liệu và cưỡng chế không tạo migration SQL rời trong các thay đổi sau.
- [x] Thêm script kiểm tra repository chỉ cho phép `supabase-unified.sql` trong nhóm schema Supabase trước khi `pnpm check` và `pnpm build`.
