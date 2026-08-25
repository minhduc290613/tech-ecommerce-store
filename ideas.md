# Định hướng thiết kế — NEXORA Tech Store

## Ba hướng tiếp cận

### 1. Circuit Atelier
**Giới thiệu ngắn:** Một không gian bán lẻ công nghệ như phòng trưng bày linh kiện cao cấp: bề mặt graphite, dải tín hiệu cyan và các đường mạch tinh tế. Cảm giác chính xác, đáng tin cậy và có chiều sâu.

**Xác suất:** 0.07

### 2. Violet Pulse
**Giới thiệu ngắn:** Thẩm mỹ câu lạc bộ đêm với tím điện, mảng gradient chuyển động và typography đầy năng lượng. Hướng này ưu tiên cảm giác sôi động của những đợt săn sale chớp nhoáng.

**Xác suất:** 0.04

### 3. Monolith Retail
**Giới thiệu ngắn:** Ngôn ngữ tối giản kiến trúc, dùng những khối đen đặc, chữ lớn và điểm nhấn kim loại lạnh. Hướng này tạo nét sang trọng, chậm rãi và có tính biên tập.

**Xác suất:** 0.09

## Hướng đã chọn: Circuit Atelier

### Design Movement
**Techno-industrial editorial** kết hợp phong cách cửa hàng công nghệ cao cấp và cảm hứng từ bảng mạch điện tử. Bố cục không gian mang tính biên tập, chuyển động giống tín hiệu được kích hoạt thay vì hiệu ứng trang trí thuần túy.

### Core Principles
1. Mọi bề mặt chính là graphite sâu, được phân lớp bằng đường viền mảnh và ánh sáng cyan có kiểm soát.
2. Thông tin thương mại được ưu tiên rõ ràng: giá ưu đãi, thời gian sale, trạng thái tồn kho và hành động mua luôn có cấp bậc thị giác mạnh.
3. Đường mạch, chấm định vị và nhãn kỹ thuật xuất hiện lặp lại để kết nối các khu vực khác nhau.
4. Hình ảnh sản phẩm là chủ thể; giao diện bao quanh để làm nổi sản phẩm chứ không cạnh tranh với sản phẩm.

### Color Philosophy
Nền **graphite/navy #0f172a** tạo cảm giác tin cậy và tập trung. **Cyan điện #38bdf8** là màu tín hiệu — chỉ xuất hiện tại hành động, số liệu live, focus và trạng thái đang chọn. **Tím điện #8b5cf6** được dùng tiết chế để đánh dấu các ưu đãi Flash Sale, tạo cảm giác năng lượng mà không làm mất tính kỹ thuật của cyan.

### Layout Paradigm
Khung nội dung dựa trên một **đường ray kỹ thuật dọc** ở desktop: thanh bộ lọc thành một bảng điều khiển bên trái, dòng sản phẩm chảy ở phần nội dung bên phải. Hero Flash Sale dùng bố cục bất đối xứng: khối thông điệp lớn ở trái, ảnh sản phẩm hero ở phải và bộ đếm nằm như một module đo đạc ở giữa. Trên mobile, đường ray chuyển thành thanh bộ lọc ngang cuộn được.

### Signature Elements
1. **Signal rails:** đường nối mảnh cyan và các điểm node nhỏ đặt quanh nhãn, bộ đếm và tiêu đề.
2. **Technical labels:** các capsule chữ mono, ví dụ `FLASH SALE // 01` hoặc `CART SYNCED`.
3. **Panel glass graphite:** các module nền tối bán trong suốt, viền sáng rất mảnh và họa tiết noise nhẹ.

### Interaction Philosophy
Tương tác luôn cho cảm giác có phản hồi tức thời và hữu dụng: nút nén nhẹ khi nhấn, thẻ sản phẩm nâng lên như được cấp nguồn, thêm giỏ hàng tạo xác nhận trực quan và mở drawer theo hướng dòng sản phẩm đi vào giỏ. Không dùng chuyển động dài hoặc hiệu ứng gây phân tâm trong bước thanh toán.

### Animation
Các tương tác UI cơ bản dùng 140–220ms, `cubic-bezier(0.23, 1, 0.32, 1)`. Flash Sale có quét sáng nền chậm và node cyan thở rất nhẹ; countdown đổi số tức thời để dễ đọc. Drawer giỏ hàng và modal đăng nhập/QR đi vào bằng `opacity + transform`, tối đa 280ms. Tôn trọng `prefers-reduced-motion` bằng cách loại bỏ các animation không thiết yếu.

### Typography System
**Space Grotesk** cho heading và thông tin giá quan trọng — góc cạnh, hiện đại, rõ ở kích thước lớn. **DM Sans** cho nội dung giao dịch, biểu mẫu và mô tả sản phẩm để giữ khả năng đọc. **JetBrains Mono** cho nhãn kỹ thuật, mã đơn hàng, countdown và microcopy trạng thái. Heading dùng trọng lượng 600–700; body 400–500; giá sale 700.

### Brand Essence
**NEXORA là storefront công nghệ dành cho người mua muốn chọn nhanh thiết bị thật đáng giá giữa những đợt ưu đãi rõ ràng, có kiểm soát và giàu thông tin.**

Tính cách thương hiệu: **chính xác, sắc sảo, tin cậy**.

### Brand Voice
Giọng văn ngắn, tự tin, ưu tiên tín hiệu hành động và lợi ích cụ thể; tránh những lời mời chung chung.

> “Bắt sóng ưu đãi trước khi giá trở về quỹ đạo.”

> “Thiết bị đúng chuẩn. Mức giá đúng thời điểm.”

### Wordmark & Logo
Wordmark `NEXORA` có ký tự **X** tạo từ hai đường tín hiệu cắt nhau. Logo mark không chữ là một **nút mạch hình lục giác mở** với hai tín hiệu chéo tạo thành chữ X âm bản — thể hiện điểm giao giữa lựa chọn và công nghệ.

### Signature Brand Color
**NEXORA Signal Cyan — #38BDF8**.

## Style Decisions

1. Mọi product card phải lấy hình thiết bị làm chủ thể chính; graphite chỉ đóng vai trò khung showroom và ánh sáng viền cyan làm tín hiệu định vị.
2. Signal rail, node dot, capsule kỹ thuật và measurement frame được lặp lại xuyên suốt catalog, FAQ, trust center và trang thông tin, không chỉ giới hạn ở hero.
3. Cyan `#38BDF8` dành cho hành động, trạng thái live và tín hiệu; violet `#8B5CF6` chỉ dành cho Flash Sale hoặc năng lượng giảm giá.
4. Nội dung công khai giữ giọng NEXORA ngắn gọn, rõ lợi ích và hướng giao dịch; nội dung triển khai nội bộ chỉ xuất hiện trong khu vực Command Deck hoặc tài liệu dự án.
5. Hình catalog dùng lớp hiệu chỉnh **graphite showroom** với ánh cyan có kiểm soát để tránh cảm giác ảnh stock rời rạc.
6. Wordmark ưu tiên can thiệp bằng hai nét cyan giao cắt đúng vị trí ký tự **X** trong các điểm chạm thương hiệu chính.
7. Bề mặt Command Deck cần mang tín hiệu **restricted console** thông qua microcopy access-state, khung đo đạc và rail mảnh thay vì chỉ dùng dark form thông thường.
