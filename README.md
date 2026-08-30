# NEXORA Tech Store

NEXORA là nền tảng thương mại điện tử công nghệ dark mode gồm storefront khách hàng, Account Center, trang Đơn hàng, Affiliate Dashboard và **NEXORA Command Deck**. Frontend dùng HTML5, CSS3 và Vanilla JavaScript ES Modules; Vite build đa trang; Supabase cung cấp Auth, PostgreSQL, RLS, Storage và RPC; Node.js/Express phục vụ bản production cùng các route backend.

## DEMO Website
Trang Chính: [Trang chính](https://nexorashop-gpjdasbm.manus.space)
Trang Command Deck: [Trang Command Deck](https://nexorashop-gpjdasbm.manus.space/admin.html)
Account Admin DEMO: Không Cho

## Tài liệu chính 

| Ngôn ngữ | Tài liệu | Nội dung |
| --- | --- | --- |
| Tiếng Việt | [Hướng dẫn triển khai và sử dụng A–Z](docs/HUONG_DAN_A_Z.md) | Cài local, kết nối Supabase, GitHub, static hosting, aaPanel Ubuntu, cPanel, vận hành, thanh toán, email, thông báo và xử lý lỗi. |
| English | [README_EN](README_EN.md) · [Deployment and User Guide](docs/DEPLOYMENT_GUIDE_EN.md) | README và tài liệu triển khai đầy đủ bằng tiếng Anh. |
| Chỉ mục | [Tài liệu dự án](docs/INDEX.md) | Các tài liệu role, wallet, Supabase, thanh toán tự động, asset và verification. |
| Admin | [Thiết lập quyền Admin](ADMIN_SETUP.md) · [Command Deck English](/admin-en.html) · [Mantis Admin](docs/MANTIS_ADMIN.md) | Cấp quyền an toàn, Admin tiếng Anh và dashboard Mantis riêng. |
| Lỗi | [Fix lỗi](docs/Error.md) | Fix lỗi nguy hiểm nên đọc |

## Tính năng nổi bật

| Khu vực | Tính năng |
| --- | --- |
| Storefront | Catalog, tìm kiếm, lọc danh mục/giá/SALE, Flash Sale, Sale Hunt, gallery sản phẩm, Quick View, giỏ hàng và responsive mobile. |
| Tài khoản | Supabase Auth, username, recovery, số điện thoại, nhiều địa chỉ, địa chỉ mặc định, số dư, ledger, thông báo và đăng xuất. |
| Đơn hàng | Checkout RPC, snapshot giá/tồn kho, QR VietQR/ZaloPay/MoMo, thanh toán số dư, trạng thái giao nhận, tracking, hủy/trả hàng theo điều kiện. |
| Command Deck | Dashboard, CRUD catalog, đơn hàng, tài khoản, role/capability, CMS, FAQ, sale campaign, logistics, email, CSV và broadcast notification. |
| Nội dung | Bài viết, bình luận/đánh giá có moderation, trang thông tin, FAQ, điều khoản, bảo mật và gian hàng. |
| Affiliate | Referral link, click tracking, đơn đủ điều kiện, hoa hồng cấu hình được và dashboard riêng tư. |
| Bảo mật | RLS, owner-scoped RPC, audit log, không lộ secret frontend, xác nhận thủ công chuyển khoản và CTA notification chỉ cho HTTPS/đường dẫn nội bộ. |

## Quick start

```bash
# Clone
git clone https://github.com/minhduc290613/tech-ecommerce-store.git
cd tech-ecommerce-store

# Install and run locally
pnpm install
pnpm dev
```

Mở `http://localhost:3000/`. Các entrypoint chính là `/admin.html` (Vietnamese Admin), `/admin-en.html` (English Admin), `/admin-mantis.html` (Mantis Admin variant), `/orders.html`, `/affiliate.html`, `/info.html` và `/article.html`. Trước khi phát hành, chạy:

```bash
pnpm test
pnpm check
pnpm build
pnpm start
```

Bản static nằm tại `dist/public`; server bundle nằm tại `dist/index.js`.

## Chọn phương án hosting

| Phương án | Khi nên dùng | Giới hạn |
| --- | --- | --- |
| GitHub Pages/Netlify/Vercel/Cloudflare Pages | Storefront gọi trực tiếp Supabase, cần static hosting. | Không chạy Node backend, email server route hoặc payment webhook. |
| cPanel static | Shared hosting chỉ có `public_html`. | Chỉ upload `dist/public`, không chạy `pnpm start`. |
| aaPanel Ubuntu/PM2 | Cần Node server, webhook, email hoặc route backend. | Cần VPS, reverse proxy, SSL và quản lý process. |
| cPanel Passenger | Hosting cPanel có Application Manager/Passenger và Node hỗ trợ. | Startup file, Node version và port phụ thuộc nhà cung cấp. |

## Bảo mật tối thiểu

Chỉ đặt Project URL và publishable/anon key trong `client/supabase-config.js`. Không commit `service_role`, `sb_secret_...`, `JWT_SECRET`, SMTP password, API key thanh toán, webhook signing secret, database export chứa PII hoặc thông tin tài khoản nhận tiền thật. Bật RLS, dùng HTTPS, MFA cho Admin và rotate secret ngay khi nghi ngờ bị lộ.

> **Schema canonical:** toàn bộ database được quản lý trong `supabase-unified.sql`. Trên project Supabase mới/trống, chạy file này một lần. Với database đã có dữ liệu production, hãy backup và tạo migration có kiểm soát; không chạy lại toàn bộ schema một cách mù quáng.

## Cấu trúc source

```text
client/
├── index.html, app.js, style.css       # storefront
├── admin.html, admin-en.html            # Command Deck Vietnamese/English
├── admin-mantis.html                     # optional Mantis-style Admin variant
├── admin.js, admin-i18n.js, admin-mantis.js # admin runtimes
├── orders.html, orders.js              # đơn hàng khách
├── affiliate.html, affiliate.js        # affiliate dashboard
├── info.html, article.html             # nội dung public
└── supabase-config.js                  # public URL + publishable key

docs/                                   # tài liệu Việt/Anh và vận hành
supabase-unified.sql                    # database/RLS/RPC canonical
vite.config.ts                          # Vite multipage build
package.json                            # commands
```

Xem hướng dẫn đầy đủ trong [docs/HUONG_DAN_A_Z.md](docs/HUONG_DAN_A_Z.md) hoặc [docs/DEPLOYMENT_GUIDE_EN.md](docs/DEPLOYMENT_GUIDE_EN.md).

## License

This project is licensed under the [MIT](LICENSE) license.
