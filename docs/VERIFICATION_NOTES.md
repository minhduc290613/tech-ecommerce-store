# Ghi nhận kiểm tra giao diện

## Role & kiểm duyệt — 25/08/2026

Command Deck hiển thị đầy đủ mục **Role & kiểm duyệt**, **Hoàn tiền & CSV** và **Cấu hình nâng cao** cho tài khoản có role `admin`. Workspace Role & kiểm duyệt tải được hai tài khoản hiện có cùng role `admin` và `customer`; các hàng đợi affiliate, review/bình luận và bài viết hiển thị trạng thái trống rõ ràng khi chưa có dữ liệu cần duyệt.

Kiểm tra giao diện không thực hiện thay đổi role, duyệt nội dung, xuất CSV hoặc điều chỉnh số dư.

## Mapping sản phẩm–gian hàng — 25/08/2026

Catalog Command Deck hiện hiển thị rõ trạng thái **Chưa gán gian hàng** ở từng sản phẩm chưa có `shop_id`. Trạng thái này cho phép admin nhận biết các sản phẩm cần gán gian hàng trước khi dùng khu vực sản phẩm nổi bật theo shop. Kiểm tra này chỉ đọc dữ liệu, không chỉnh sửa catalog.

## Trang đọc bài viết — 25/08/2026

Đã mở trực tiếp `article.html?slug=kiem-tra-tuyen-duong`. Route tải bundle article riêng, đặt đúng tiêu đề **Bài viết | NEXORA**, và hiển thị empty state an toàn khi slug không tồn tại hoặc bài chưa được xuất bản. Không tạo nội dung, đánh giá hoặc bình luận mẫu để phục vụ kiểm thử.

## Hoàn tiền, CSV và guard database — 25/08/2026

Workspace **Hoàn tiền & CSV** tải đúng cho admin, hiển thị bảng empty state khi chưa có yêu cầu hoàn tiền và phân biệt rõ quyền order manager duyệt yêu cầu với quyền admin xuất sổ cái/yêu cầu nạp CSV. Hai nút export hiện diện nhưng không được kích hoạt trong lần kiểm tra để tránh tạo file chứa dữ liệu tài chính nội bộ không cần thiết.

Các helper database xác nhận customer không có quyền quản lý role, moderation, đơn hàng, tạo bài viết hay Command Deck; admin có toàn bộ capability tương ứng. Hai trigger affiliate bị thu hồi `EXECUTE` khỏi `authenticated`, trong khi RPC yêu cầu affiliate/hoàn tiền vẫn dành cho user đã đăng nhập và tự kiểm tra quyền/điều kiện. Kiểm thử customer chưa đủ điều kiện đã bị `request_affiliate_access()` từ chối mà không tạo `affiliate_profiles`; kiểm thử yêu cầu hoàn tiền với đơn không tồn tại cũng bị từ chối trước khi tạo request hoặc thay đổi số dư.

Probe role tạm thời đã xác nhận `moderator` có quyền quản lý role không phải admin, moderation, viết bài và vào Command Deck; không có quyền quản lý đơn hoặc là admin. Thử gán lại role `admin` cho tài khoản admin bị từ chối đúng guard, và bản ghi role test được xóa ngay trong cùng probe. Không tạo audit role, đơn hàng, refund, review/bình luận, hoa hồng hoặc thay đổi số dư trong kiểm thử này.

## Cấu hình hoa hồng affiliate — 25/08/2026

Sau khi thêm RPC admin và tải lại Command Deck, workspace **Cấu hình nâng cao** hiển thị đầy đủ trường bật/tắt chương trình affiliate, tỷ lệ hoa hồng phần trăm, số đơn đã giao tối thiểu, giá trị đơn tối thiểu và yêu cầu duyệt. Giá trị runtime hiện tại là 15%, 1 đơn đã giao, giá trị tối thiểu 0 và yêu cầu duyệt. Giao diện ghi rõ cấu hình chỉ tác động đơn referral được giao về sau, không hồi tố chứng từ hoa hồng đã tồn tại.

Đã nhập và lưu tạm **12,5%** bằng chính biểu mẫu admin; Command Deck trả toast xác nhận lưu cấu hình payment, hiệu ứng và hoa hồng affiliate. Giá trị được khôi phục về 15% ngay sau bước kiểm tra UI trong quy trình xác minh tiếp theo.

## Export CSV admin — 25/08/2026

Workspace Hoàn tiền & CSV chỉ hiển thị nút export cho phiên admin. Đã kích hoạt xuất sổ cái CSV để xác minh luồng tải cục bộ; file không được tải lên, đính kèm, chia sẻ hay công bố. Nội dung chỉ được kiểm tra ở mức cấu trúc cột nội bộ.

Trình duyệt đã xác nhận file `so-cai-nexora-2026-08-25.csv` được tạo. Bản CSV kiểm thử sau đó được xóa cục bộ; không đọc hoặc lưu lại dữ liệu sổ cái trong workspace.

## E2E có xác nhận: affiliate, refund và moderation — 25/08/2026

Theo xác nhận của chủ sở hữu, fixture đơn **20.000 ₫** đã được tạo để kiểm tra commission/refund rồi được xóa sau test. Khi chuyển đơn sang `delivered`, hệ thống ghi **3.000 ₫** commission ở mức **15%** vào ví affiliate test. Hoàn tiền ví **20.000 ₫** tạo ledger refund và đổi trạng thái commission sang `pending_reversal`. Đơn, refund request, commission, ledger fixture được xóa; số dư hai ví được khôi phục đúng giá trị trước test. Audit cấu hình affiliate được giữ lại như dấu vết vận hành hợp lệ.

Fixture bài viết kỹ thuật không phải nội dung người dùng đã đi từ `pending` sang `published`, có `published_at` và `reviewed_by`, sau đó được xóa cùng audit fixture. Không tạo review, bình luận, rating hoặc testimonial giả trong bất kỳ kiểm thử nào.

## Advisory Supabase còn lại — 25/08/2026

Security Advisor tiếp tục cảnh báo các RPC `SECURITY DEFINER` được cấp cho `authenticated`, gồm checkout, account, role, moderation, affiliate, refund và RPC cấu hình affiliate mới. Đây là các RPC công khai có chủ đích cho user đã đăng nhập; từng hàm thực thi guard `auth.uid()` và/hoặc kiểm tra role trong thân hàm. Hai trigger nội bộ `attach_affiliate_to_order` và `create_affiliate_commission` đã bị thu hồi `EXECUTE` khỏi `authenticated` và được xác minh riêng. Cảnh báo linter không đồng nghĩa những guard runtime này đã được bypass; vẫn cần rà soát định kỳ theo [hướng dẫn linter Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Catalog và runtime sạch — 25/08/2026

Sau restart, storefront tải catalog sáu sản phẩm và hiển thị module lọc CPU/Chip, RAM và Ổ cứng/Lưu trữ cùng danh mục, giá và SALE. Snapshot ba route `/`, `/admin.html` và `article.html?slug=kiem-tra-tuyen-duong` đều render; article hiển thị empty state đúng với slug không tồn tại. Console/network sau restart không có lỗi runtime, import hoặc request 4xx/5xx mới.

## Bài viết và bình luận theo role — 25/08/2026

RPC `save_my_article` đã được kiểm thử trực tiếp với role `marketing`, `moderator`, `affiliate` và `admin`: cả bốn đều tạo được draft, có đúng tác giả test, sau đó fixture bị xóa và role customer ban đầu được khôi phục. Bản ghi bình luận kỹ thuật trung tính được tạo ở trạng thái `pending`, admin moderation sang `hidden` có `reviewed_by`/`reviewed_at`, rồi bị xóa cùng audit fixture. Không tạo review, rating hoặc testimonial giả để kiểm thử; điều này bị cấm theo chính sách nội dung. Chức năng review vẫn áp dụng cùng RPC moderation và guard database, nhưng nên được kiểm chứng với đánh giá thật do khách hàng gửi trong môi trường vận hành.

## CTA bình luận và đăng xuất — 25/08/2026

Storefront sau build hiển thị nút **Bình luận** có nhãn và `aria-label` riêng trên cả sáu thẻ sản phẩm, không còn phụ thuộc vào biểu tượng Quick View khó thấy. Kích hoạt CTA bằng DOM đã xác nhận Quick View mở (`hidden=false`) và focus rơi đúng vào `#commentBody` sau một nhịp render; console storefront không ghi nhận lỗi. Account Center hiển thị trực quan nút **Đăng xuất** ở header, đồng thời vẫn giữ nút trong tab Bảo mật; cả hai gọi cùng luồng `db.auth.signOut()`. Không click logout khi kiểm tra để không cắt phiên admin đang dùng.

Một Supabase client disposable với storage key tách biệt đã đăng ký phiên test, xác nhận session tồn tại trước logout, gọi `signOut()` không lỗi và nhận session `null` sau đó. Phiên admin trong storefront vẫn tồn tại. Tài khoản probe được đưa vào bước dọn dữ liệu sau kiểm tra.

Tài khoản logout probe đã được xóa và truy vấn xác nhận còn `0` tài khoản thử nghiệm. Fixture comment nâng cao xác nhận rõ trạng thái ban đầu `pending`, trạng thái sau moderation `hidden`, có `reviewed_by`/`reviewed_at`, và sau cleanup không còn cả comment lẫn audit moderation.

Guard `submit_product_review` cũng đã được gọi với input không hợp lệ và từ chối đúng thông báo yêu cầu rating 1–5 sao cùng nội dung tối thiểu, trước khi bất kỳ review nào được insert. Không tạo review/rating giả; trạng thái pending → moderation của review cần sử dụng đánh giá thật từ khách đã nhận hàng.

Sau restart, Command Deck `/admin.html` tải đầy đủ với menu Role & kiểm duyệt, Hoàn tiền & CSV và Cấu hình nâng cao; console phiên mới trống. Cảnh báo import `admin-roles-content.js` và `mountProductShopSelector` trong log cũ không tái diễn khi tải trang quản trị hiện tại.

Snapshot mobile 390 × 844 sau thay đổi cho thấy catalog vẫn responsive; CTA **Bình luận** được tách thành hàng riêng dưới các nút mua/xem nhanh để tránh co hẹp thao tác trên thẻ sản phẩm.

Notification moderation: Command Deck đã đăng ký thành công kênh Realtime `nexora-moderation-notifications` ở trạng thái `joined` cho bảng review và bình luận; bước tiếp theo dùng fixture bình luận kỹ thuật để xác minh badge/queue cập nhật thực tế.

Fixture comment pending đã cập nhật Command Deck tức thời: nav **Role & kiểm duyệt** hiện badge `1`, workspace hiển thị panel cảnh báo “1 nội dung cần kiểm duyệt”, và queue chứa đúng fixture với thao tác Duyệt/Ẩn. Không cần tải lại trang.

Khi ẩn fixture từ chính queue moderation, badge và panel trở về trạng thái ẩn, queue trả empty state. Sau kiểm tra, cả fixture comment lẫn audit moderation đã được xóa thành công.

Sau cập nhật subscription cho cả `INSERT` và `UPDATE`, kênh Realtime Command Deck đã reload và trở lại trạng thái `joined`; kiểm thử tiếp theo dùng comment kỹ thuật chuyển hidden → pending để xác nhận event UPDATE.

Fixture transition đã được chuyển sang `hidden` và queue được làm mới; badge, panel cảnh báo và danh sách review/bình luận đều trở về empty state trước event `UPDATE → pending`.

Sau khi cập nhật fixture về `pending`, badge Role & kiểm duyệt tăng lại thành `1` ngay trên màn hình tổng quan không cần reload. Khi ẩn fixture qua UI moderation, badge/panel quay về ẩn và queue rỗng. Đây là xác minh E2E cho cơ chế `UPDATE → pending`; cùng guard unit áp dụng cho payload review upsert mà không tạo review/rating giả.

Fixture transition và audit moderation của nó đã được xóa thành công sau kiểm tra.

## Menu mobile, CMS và role tùy chỉnh — 26/08/2026

Menu ba gạch storefront đã được thay bằng luồng mở/đóng có `aria-expanded`, `aria-hidden`, backdrop chạm để đóng, phím Escape, khôi phục focus về nút menu và khóa scroll nền khi đang mở. Snapshot mobile **390 × 844** xác nhận storefront vẫn responsive sau thay đổi; console/runtime phiên khởi động sạch không có lỗi JavaScript hoặc import mới.

Schema canonical đã thêm `role_definitions`, capability động và metadata SEO/icon CMS; Supabase production đã áp dụng migration tương ứng. Probe admin tạo role kỹ thuật `support_editor_e2e` với capability mở Command Deck/tạo bài viết, xác nhận capability được lưu, rồi xóa role và kiểm tra còn `0` bản ghi. Không thay đổi role người dùng hay dữ liệu tài chính. Command Deck cho admin hiện có form tạo, đổi tên hiển thị, chỉnh capability và xóa role tùy chỉnh; CMS Thương hiệu quản lý tên website, logo, favicon, title/mô tả SEO, ảnh chia sẻ và banner.

Toàn bộ migration SQL rời trong repository đã được hợp nhất/xóa theo yêu cầu; chỉ còn `supabase-unified.sql`. Test unit (**12**), kiểm tra TypeScript và build production đã hoàn tất thành công trước xác minh giao diện.
