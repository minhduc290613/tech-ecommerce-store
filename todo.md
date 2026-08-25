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
