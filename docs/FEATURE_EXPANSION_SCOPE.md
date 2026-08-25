# Phạm vi mở rộng role, nội dung và vận hành

Tài liệu này ghi nhận yêu cầu mở rộng NEXORA từ người quản trị, bao gồm nội dung trong hai ảnh cung cấp ngày 25/08/2026. Đây là nguồn đối chiếu khi triển khai và kiểm thử.

## Yêu cầu storefront từ ảnh thứ nhất

| Hạng mục | Yêu cầu đã xác nhận |
| --- | --- |
| Bộ lọc nâng cao | Cho phép lọc nhanh theo thông số kỹ thuật như CPU, RAM và ổ cứng. |
| Đánh giá/bình luận | Có review và comment theo từng sản phẩm; quản trị viên duyệt hoặc ẩn trong Command Deck. |
| Gian hàng | Hiển thị sản phẩm bán chạy hoặc sản phẩm giảm giá nổi bật tại trang chi tiết từng gian hàng. |

## Yêu cầu quản trị, tài chính và nội dung

Người quản trị yêu cầu cấu hình thông tin tài khoản nhận tiền thật và liên hệ Zalo trong trang quản trị, bổ sung trạng thái hoàn tiền cho đơn hàng/giao dịch người dùng, và xuất CSV cho sổ cái số dư cùng yêu cầu nạp tiền. Nội dung này đã được xác nhận lại từ ảnh thứ hai.

## Yêu cầu phân quyền và affiliate

| Role | Phạm vi quyền dự kiến |
| --- | --- |
| `admin` | Cấp cao nhất; quản lý role, shop, banner, sale, mô tả, giới thiệu, logo, favicon, hiệu ứng và mọi nghiệp vụ. |
| `moderator` | Kiểm duyệt nội dung gộp gồm bình luận/đánh giá, cùng quyền quản lý phù hợp; có thể viết bài. |
| `order_manager` | Duyệt và vận hành đơn hàng/hoàn tiền theo phạm vi được cấp. |
| `marketing` | Tạo, sửa và xuất bản bài viết; không có quyền tài chính hoặc role. |
| `affiliate` | Chỉ có sau khi đủ điều kiện; tạo link giới thiệu, chia sẻ và nhận hoa hồng 15% khi đơn hợp lệ. Có thể viết bài. |
| `customer` | Vai trò mặc định, không có quyền vận hành. |

> Các trạng thái tài chính như hoa hồng affiliate và hoàn tiền phải được ghi vào sổ cái/audit log; không chỉnh trực tiếp số dư qua giao diện.

## Quy tắc triển khai được chọn

Quyền được lưu theo từng role thay vì chỉ dựa vào một cờ admin. `admin` giữ toàn quyền và là role duy nhất sửa nhận diện/cấu hình shop; `moderator` quản lý role không cấp cao, kiểm duyệt review/bình luận và duyệt bài; `order_manager` xử lý đơn/hoàn tiền; `marketing` và `affiliate` chỉ soạn bài. Các thao tác role, kiểm duyệt, hoàn tiền và hoa hồng đều tạo audit log.

Affiliate có mã giới thiệu/link riêng. Điều kiện sẽ nằm trong cấu hình chương trình để admin thay đổi; bản đầu dùng **ít nhất một đơn đã giao và cần duyệt**. Hoa hồng cố định **15%** chỉ được ghi vào số dư affiliate khi đơn giới thiệu ở trạng thái đã thanh toán và giao thành công; mỗi đơn chỉ được ghi hoa hồng một lần. Hoàn tiền về ví cũng phải là một dòng sổ cái riêng, trong khi hoàn tiền chuyển khoản thủ công chỉ được ghi trạng thái để đối soát.
