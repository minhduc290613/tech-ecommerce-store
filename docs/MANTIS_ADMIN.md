# NEXORA Mantis Admin Variant

## Tiếng Việt

Mantis Admin là giao diện quản trị phụ, độc lập với `admin.html` và `admin-en.html`. Mở giao diện tại `/admin-mantis.html`; bản online là `https://nexorashop-gpjdasbm.manus.space/admin-mantis.html`. Giao diện này dùng bố cục sidebar, topbar, card và responsive drawer theo phong cách Mantis Bootstrap, nhưng được viết thành entrypoint riêng trong NEXORA.

Mantis Admin sử dụng cùng Supabase Auth, `client/supabase-config.js`, RPC `can_access_command_deck`, RPC `is_admin`, bảng role hiện có và RLS của NEXORA. Người dùng phải có quyền truy cập Command Deck; trang không cấp quyền, không tạo tài khoản Admin và không chứa service-role key. Nếu tài khoản không đủ quyền, trang sẽ từ chối truy cập.

Dashboard Mantis hiển thị số liệu thực từ Supabase như doanh thu các đơn đã xác nhận, tổng đơn, số sản phẩm, số hồ sơ người dùng và role hiện tại. Overview có biểu đồ doanh thu 7 ngày và bảng 6 đơn hàng mới nhất. Sidebar có các mục quản lý sản phẩm và người dùng; đây là các trang tổng quan/điểm mở nhanh, còn CRUD và thao tác tài khoản đầy đủ mở trong `/admin-en.html`. Vì vậy Mantis Admin là dashboard/quick-launch phụ, không thay thế luồng quản trị hiện tại.

Nút chuyển ngôn ngữ trên topbar đổi giữa English và Tiếng Việt, lưu lựa chọn trong trình duyệt. Nút theme đổi giữa Light và Dark Mode, cũng lưu lựa chọn cục bộ; giao diện vẫn tôn trọng `prefers-reduced-motion`. Các số liệu và danh sách đều dùng dữ liệu thật theo phạm vi RLS của tài khoản hiện tại, không tạo dữ liệu mẫu.

### Cách sử dụng

1. Đăng nhập bằng tài khoản đã được cấp role phù hợp.
2. Dùng sidebar để xem Overview, Catalog snapshot, Order operations hoặc Access & links.
3. Chọn Full English Admin để thực hiện chỉnh sửa dữ liệu thật.
4. Dùng Sign out khi kết thúc phiên, đặc biệt trên máy dùng chung.

### Argon Admin phụ

Argon Admin mở tại `/admin-argon.html` và là variant phụ độc lập dựa trên layout tham khảo của [Argon Dashboard](https://github.com/creativetimofficial/argon-dashboard). Variant này dùng chung Supabase Auth, RLS, dashboard metrics và bộ chọn ngôn ngữ/theme; không thay thế `admin.html`, `admin-en.html` hoặc `admin-mantis.html`. Bộ chọn tiền tệ hỗ trợ VND, USD, EUR, GBP, JPY, CNY, KRW, SGD, THB, AUD và CAD cho mục đích hiển thị dashboard. Giá trị thanh toán gốc của NEXORA vẫn cần được xác nhận theo VND cho đến khi cấu hình cổng thanh toán đa tiền tệ hoàn tất.

### Tawk, banner và thanh toán quốc tế

Panel **Tích hợp** cho phép bật Tawk.to bằng Property ID và Widget ID công khai, tạo banner cảnh báo song ngữ với mức độ/màu tùy chỉnh, và quản lý trạng thái các phương thức PayPal, Wise, Alipay, Apple Pay và Google Pay. Secret key không nhập vào browser và trạng thái tự động vẫn bị khóa cho tới khi có secret server, webhook và xác minh chữ ký. Các phương thức thủ công hiện tại không bị thay đổi.

### License và tài sản

Repository tham khảo là [Mantis Free Bootstrap Admin Template](https://github.com/codedthemes/mantis-free-bootstrap-admin-template), được phát hành theo MIT License. NEXORA chỉ sử dụng pattern bố cục và Bootstrap CDN trong variant này; không đưa asset build của repository vào storefront. Thông báo license được giữ trong `client/admin-mantis.html` và footer của trang.

## English

Mantis Admin is a separate, optional administration surface. It does not replace `admin.html` or `admin-en.html`. Open it at `/admin-mantis.html`; the live URL is `https://nexorashop-gpjdasbm.manus.space/admin-mantis.html`. The page follows the Mantis Bootstrap layout pattern with a sidebar, topbar, cards, and responsive navigation drawer, while remaining a standalone NEXORA entrypoint.

The page uses the same Supabase Auth session, `client/supabase-config.js`, `can_access_command_deck` RPC, `is_admin` RPC, existing role model, and NEXORA RLS policies. It does not grant roles, create administrator accounts, or contain a service-role key. Accounts without Command Deck access are denied.

The dashboard reads real Supabase data for confirmed revenue, total orders, product count, visible customer profiles, and the current role. The Overview includes a seven-day revenue chart and a six-row latest-orders table. The sidebar includes Product management and User management views; full CRUD and account actions continue in `/admin-en.html`, which contains product CRUD, order operations, CMS, roles, notifications, sale campaigns, and other management modules. Mantis Admin is therefore a dashboard and quick-launch surface, not a replacement for the existing Command Deck.

The topbar language control switches between English and Vietnamese and persists the choice in local storage. The theme control switches between Light and Dark Mode and also persists locally; non-essential motion respects `prefers-reduced-motion`. Metrics and lists use real data within the current account's RLS scope and do not create demo data.

### How to use it

1. Sign in with an account that has an appropriate NEXORA role.
2. Use the sidebar to open Overview, Catalog snapshot, Order operations, or Access & links.
3. Select Full English Admin when you need to edit real data.
4. Select Sign out when finished, especially on a shared computer.

### Argon Admin variant

Argon Admin is available at `/admin-argon.html` as a separate optional surface based on the [Argon Dashboard](https://github.com/creativetimofficial/argon-dashboard) layout reference. It shares Supabase Auth, RLS, dashboard metrics, language and theme controls, but does not replace `admin.html`, `admin-en.html`, or `admin-mantis.html`. Its currency selector supports VND, USD, EUR, GBP, JPY, CNY, KRW, SGD, THB, AUD and CAD for dashboard display. NEXORA payment amounts should still be confirmed in VND until a multi-currency payment provider is configured.

### Tawk, warning banner and international payments

The **Integrations** panel can enable Tawk.to with public Property ID and Widget ID, configure a bilingual storefront warning banner with level/color controls, and manage PayPal, Wise, Alipay, Apple Pay and Google Pay readiness. Secret keys are not entered into the browser, and automatic processing remains locked until server secrets, a webhook and signature verification are configured. Existing manual methods are unchanged.

### License and assets

The reference repository is [Mantis Free Bootstrap Admin Template](https://github.com/codedthemes/mantis-free-bootstrap-admin-template), released under the MIT License. NEXORA uses the layout pattern and Bootstrap CDN for this variant; it does not copy the repository build assets into the storefront. The license notice is retained in `client/admin-mantis.html` and the page footer.
