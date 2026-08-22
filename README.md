# NEXORA Tech Store

NEXORA Tech Store là storefront công nghệ dark mode xây dựng theo phong cách **Circuit Atelier**, sử dụng HTML5, CSS3, JavaScript ES Modules và Supabase. Project gồm storefront bán hàng tại `/` cùng **NEXORA Command Deck** dành cho quản trị tại `/admin.html`.

> **Lưu ý bảo mật:** Project chỉ dùng Supabase **anon public key** ở trình duyệt. Không đưa `service_role key`, mật khẩu mặc định, hay thông tin tài khoản nhận tiền thật vào repository công khai.

## Tính năng chính

| Khu vực | Chức năng |
| --- | --- |
| Storefront `/` | Flash Sale countdown, tìm kiếm, lọc danh mục/giá/SALE, product grid, quick view và giỏ hàng localStorage. |
| Khách hàng | Đăng ký, đăng nhập, đăng xuất bằng Supabase Auth Email/Password. |
| Checkout | Đăng nhập bắt buộc, tạo đơn hàng bằng RPC nguyên tử, lưu `orders` và `order_items`, hiển thị VietQR/MoMo. |
| Admin `/admin.html` | Kiểm tra quyền quản trị bằng RLS, dashboard chỉ số, CRUD sản phẩm và cập nhật trạng thái đơn hàng. |
| Security | RLS bảo vệ catalog, đơn hàng và quyền admin; giá checkout được lấy lại từ database thay vì tin dữ liệu từ browser. |

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript ES Modules |
| Build tool | Vite |
| Database & Auth | Supabase PostgreSQL, Row Level Security, Supabase Auth |
| Icons | Font Awesome CDN |
| UI | Dark mode, CSS Grid/Flexbox, responsive desktop/mobile |

## Cấu trúc project

```text
tech-ecommerce-store/
├── client/
│   ├── index.html              # Storefront
│   ├── app.js                  # Logic storefront, Auth, cart, checkout
│   ├── style.css               # Style storefront
│   ├── admin.html              # NEXORA Command Deck
│   ├── admin.js                # Logic quản trị Supabase
│   ├── admin.css               # Style Command Deck
│   └── supabase-config.js      # URL và anon key dùng chung
├── supabase-schema.sql         # Schema catalog, orders, RPC checkout
├── supabase-admin.sql          # Bảng/admin RLS policies cho Command Deck
├── ADMIN_SETUP.md              # Hướng dẫn nhanh cấp quyền admin
├── package.json                # Commands build/development
└── vite.config.ts              # Vite multi-page build cho / và /admin.html
```

## Chạy local

Project dùng `pnpm`. Sau khi clone hoặc tải mã nguồn về, cài dependency và chạy development server bằng các lệnh dưới đây.

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:3000/` để dùng storefront và `http://localhost:3000/admin.html` để mở Command Deck. Để kiểm tra bản production, chạy:

```bash
pnpm build
pnpm start
```

### Triển khai trên static hosting

Sau khi chạy `pnpm build`, hãy đặt **publish directory** của host thành `dist/public`. Thư mục này chứa `index.html` và `admin.html` đã được Vite đóng gói sẵn, nên đây là lựa chọn khuyến nghị cho Netlify, Cloudflare Pages, GitHub Pages hoặc các host tĩnh tương tự.

Project cũng có thêm `index.html` ở **root repository**. File này chuyển tiếp về `client/` để các host đơn giản chỉ tìm `index.html` ở root vẫn nhận diện được storefront source. Khi host có bước build, vẫn nên ưu tiên publish `dist/public` để nhận asset đã tối ưu và entrypoint quản trị đầy đủ.

| Lệnh | Mục đích |
| --- | --- |
| `pnpm dev` | Chạy Vite development server có hot reload. |
| `pnpm build` | Build storefront và `admin.html` vào `dist/public`. |
| `pnpm start` | Phục vụ bản production từ thư mục build. |
| `pnpm check` | Chạy kiểm tra TypeScript của template. |
| `pnpm format` | Format source bằng Prettier. |

## Cấu hình Supabase

### 1. Tạo project Supabase

Tạo một project tại [Supabase Dashboard](https://supabase.com/dashboard), sau đó lấy **Project URL** và **anon public key** trong mục **Project Settings → API**. Chỉ dùng anon key ở frontend; đây là key được thiết kế để hoạt động cùng RLS [1].

### 2. Điền cấu hình dùng chung

Mở `client/supabase-config.js` rồi thay hai placeholder bằng thông tin project của bạn.

```js
export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-public-key";
```

Cấu hình này được import cho cả storefront lẫn `/admin.html`; bạn chỉ cần thay một lần.

### 3. Tạo database và chính sách RLS

Trong **Supabase SQL Editor**, chạy lần lượt theo đúng thứ tự:

```text
1. supabase-schema.sql
2. supabase-admin.sql
3. supabase-marketplace-cms.sql
4. supabase-catalog-admin.sql
5. supabase-order-operations.sql
6. supabase-payment-confirmation.sql
```

Tệp đầu tạo ba bảng dữ liệu chính cùng policy và function checkout. Tệp sau tạo bảng `admin_users`, function `is_admin()` và các policy riêng cho Command Deck. Tệp thứ ba tạo CMS cho nhận diện website, banner, FAQ, nội dung điều khoản/bảo mật và danh mục gian hàng. Tệp thứ tư bổ sung SKU, thương hiệu, bảo hành, trạng thái hiển thị và policy catalog cho trình quản lý sản phẩm đầy đủ. Tệp thứ năm bổ sung thông tin khách/giao nhận, pipeline fulfillment và các chỉ mục dashboard đơn hàng/doanh thu. Tệp thứ sáu thêm số Zalo shop và dữ liệu xác nhận chuyển khoản.

| Bảng | Nội dung |
| --- | --- |
| `products` | Catalog sản phẩm, giá, tồn kho, danh mục, sale và trạng thái featured. |
| `orders` | Đơn của mỗi người dùng, tổng tiền, payment method và trạng thái xử lý. |
| `order_items` | Snapshot tên sản phẩm, đơn giá, số lượng và subtotal của mỗi đơn. |
| `admin_users` | Danh sách user ID được phép truy cập Command Deck. |

### 4. Bật Email/Password Auth

Vào **Authentication → Providers → Email** và bảo đảm phương thức Email được bật. Nếu đang thử nghiệm, bạn có thể cấu hình xác nhận email theo nhu cầu; khi vận hành thật, nên bật xác nhận email và thiết lập Site URL/redirect URL đúng domain của website [2].

## Thiết lập tài khoản admin

Không có tài khoản hay mật khẩu admin mặc định trong code. Một tài khoản mặc định như `admin/admin123` dễ bị chiếm quyền khi source bị lộ hoặc domain được công khai.

Quy trình cấp admin gồm ba bước ngắn:

1. Tạo tài khoản bằng email và mật khẩu mạnh tại storefront: **Đăng nhập → Đăng ký**.
2. Trong `supabase-admin.sql`, thay email trong câu lệnh mẫu sau bằng email vừa tạo và chạy câu lệnh đó trong Supabase SQL Editor.

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@yourdomain.com'
on conflict (user_id) do nothing;
```

3. Đăng nhập tại **`/admin.html`** bằng chính email đó. Hệ thống sẽ gọi `is_admin()` và chỉ mở Command Deck khi RLS xác nhận quyền.

> Khi cần cấp thêm quản trị viên, chỉ cần tạo Supabase Auth user mới rồi thêm `user_id` tương ứng vào `admin_users`. Không cần sửa JavaScript.

## Vận hành Command Deck

Sau khi đăng nhập bằng admin, Command Deck có ba khu vực.

| Khu vực | Thao tác |
| --- | --- |
| Tổng quan | Xem doanh thu các đơn đã thanh toán, số đơn, đơn đang chờ thanh toán, số sản phẩm và feed đơn mới nhất. |
| Sản phẩm | Thêm mới, cập nhật, chỉnh sale/featured, tồn kho và xóa sản phẩm khỏi catalog. |
| Đơn hàng | Lọc theo trạng thái và cập nhật luồng `pending_payment → paid → processing → completed` hoặc `cancelled`. |

## Cấu hình thanh toán QR

Mở `client/app.js` và điền các thông tin nhận tiền trong `PAYMENT_CONFIG`.

```js
const PAYMENT_CONFIG = {
  bankId: "MB",
  accountNumber: "0123456789",
  accountName: "NEXORA TECH STORE",
  momoPhone: "0900000000",
};
```

Khi để nguyên dữ liệu placeholder, giao diện sẽ hiện một trạng thái cấu hình rõ ràng thay vì mã QR lỗi. Trước khi vận hành thật, hãy thay bằng mã ngân hàng, số tài khoản, tên người nhận và số MoMo thật. Website tạo đơn ở trạng thái `pending_payment`; việc xác nhận tiền nên được đối soát rồi cập nhật trong Command Deck.

## Luồng checkout

```text
Thêm vào giỏ → Đăng nhập → Thanh toán
→ RPC create_order_with_items
→ Supabase đọc giá/tồn kho từ products
→ Tạo orders + order_items trong cùng transaction
→ Hiển thị QR VietQR/MoMo
→ Admin đối soát và cập nhật trạng thái đơn
```

Function `create_order_with_items` dùng database làm nguồn giá và tồn kho, giúp hạn chế việc browser tự thay đổi số tiền trước khi gửi đơn. Chính sách RLS là lớp kiểm soát quyền truy cập chính, do đó không nên tắt RLS trên các bảng này [3].

## Kiểm tra trước khi vận hành

| Hạng mục | Xác nhận |
| --- | --- |
| Storefront | Tìm kiếm, lọc, quick view, giỏ hàng và modal đăng nhập hoạt động. |
| Supabase | `supabase-schema.sql` và `supabase-admin.sql` đã chạy không báo lỗi. |
| Auth | Có thể đăng ký/đăng nhập và session được duy trì. |
| Admin | User quản trị đã có bản ghi trong `admin_users` và đăng nhập được `/admin.html`. |
| Payment | `PAYMENT_CONFIG` không còn placeholder và quét QR ra đúng thông tin. |
| Build | `pnpm build` hoàn tất thành công trước khi phát hành. |

## Khắc phục lỗi phổ biến

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Storefront hiển thị catalog mẫu | Chưa cấu hình Supabase hoặc truy vấn `products` bị RLS chặn. | Kiểm tra `supabase-config.js`, sau đó chạy `supabase-schema.sql`. |
| Không đăng nhập được admin | User chưa được cấp quyền trong `admin_users`. | Chạy câu lệnh cấp quyền ở phần **Thiết lập tài khoản admin**. |
| Admin báo không tải được dữ liệu | Chưa chạy `supabase-admin.sql` hoặc đang dùng sai anon key/project. | Chạy lại SQL, kiểm tra URL/key và đăng nhập lại. |
| QR không xuất hiện | `PAYMENT_CONFIG` vẫn là placeholder hoặc nguồn QR không tải được. | Điền dữ liệu nhận tiền thật và kiểm tra kết nối mạng. |
| Đơn không tạo được | Người dùng chưa đăng nhập, RLS chưa đúng, hoặc tồn kho không đủ. | Kiểm tra session, SQL schema và stock của sản phẩm. |

## Tài liệu tham khảo

[1] [Supabase: API Keys](https://supabase.com/docs/guides/api/api-keys)

[2] [Supabase: Password-based Auth](https://supabase.com/docs/guides/auth/passwords)

[3] [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
