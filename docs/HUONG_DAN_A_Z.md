# NEXORA Tech Store — Hướng dẫn cài đặt, kết nối và vận hành từ A–Z

Tài liệu này hướng dẫn triển khai **NEXORA Tech Store** từ repository GitHub đến storefront, Supabase, trang quản trị, thanh toán QR, media và vận hành hằng ngày. NEXORA là storefront công nghệ sử dụng HTML/CSS/JavaScript ES Modules ở browser, Vite để build và Supabase cho Auth, PostgreSQL, RLS và các RPC checkout.

> **Đối tượng áp dụng:** người phát triển, chủ cửa hàng và quản trị viên có quyền truy cập repository cùng project Supabase. Tài liệu được thiết kế để có thể công khai trên GitHub; vì vậy các ví dụ chỉ dùng placeholder và **không chứa** mật khẩu, service role key, thông tin ngân hàng thật hay dữ liệu khách hàng.

## Mục lục

1. [Bức tranh hệ thống](#1-bức-tranh-hệ-thống)
2. [Yêu cầu trước khi bắt đầu](#2-yêu-cầu-trước-khi-bắt-đầu)
3. [Lấy mã nguồn và chạy local](#3-lấy-mã-nguồn-và-chạy-local)
4. [Kết nối Supabase từ đầu](#4-kết-nối-supabase-từ-đầu)
5. [Cấu hình xác thực email](#5-cấu-hình-xác-thực-email)
6. [Cấp quyền Command Deck](#6-cấp-quyền-command-deck)
7. [Cấu hình thanh toán và Zalo](#7-cấu-hình-thanh-toán-và-zalo)
8. [Media, GitHub và public repository](#8-media-github-và-public-repository)
9. [Build và triển khai](#9-build-và-triển-khai)
10. [Vận hành hằng ngày](#10-vận-hành-hằng-ngày)
11. [Kiểm thử trước khi mở bán](#11-kiểm-thử-trước-khi-mở-bán)
12. [Xử lý lỗi thường gặp](#12-xử-lý-lỗi-thường-gặp)
13. [An toàn dữ liệu và checklist production](#13-an-toàn-dữ-liệu-và-checklist-production)

---

## 1. Bức tranh hệ thống

| Khu vực | URL/entrypoint | Vai trò |
| --- | --- | --- |
| Storefront | `/` → `client/index.html` | Catalog, tìm kiếm, lọc, sale hunt, quick view, giỏ hàng, Auth và checkout QR. |
| Command Deck | `/admin.html` → `client/admin.html` | Dashboard, sản phẩm, đơn hàng, giao nhận, CMS, FAQ, gian hàng và sale campaign. |
| Trang thông tin | `/info.html` → `client/info.html` | Điều khoản, bảo mật, giao hàng/đổi trả, giới thiệu và liên hệ. |
| Trang bài viết | `/article.html?slug=<slug>` → `client/article.html` | Chỉ hiển thị bài đã `published`, có trạng thái không tìm thấy an toàn. |
| Database/Auth | Supabase | PostgreSQL, Supabase Auth, RLS, RPC checkout và dữ liệu CMS. |
| Schema chuẩn | `supabase-unified.sql` | Một file SQL canonical gồm 25 bảng public, policy, RPC, index, seed, Account Center, role/capability tùy chỉnh, moderation, affiliate và refund. |
| Media source | GitHub `assets/media` + storage URL | Branch `assets` lưu backup binary; storefront dùng URL storage/CDN thay vì nhét media vào source build. |

Luồng mua hàng tiêu chuẩn là: **khách xem sản phẩm → thêm giỏ localStorage → đăng nhập → tạo đơn qua RPC → nhận QR/chỉ dẫn thanh toán → nhắn Zalo xác nhận (nếu được cấu hình) → admin đối soát và cập nhật đơn**.

## 2. Yêu cầu trước khi bắt đầu

| Thành phần | Yêu cầu khuyến nghị | Lý do |
| --- | --- | --- |
| Git | Bản ổn định mới | Clone/fork, quản lý nhánh và public source. |
| Node.js | 20 LTS hoặc mới hơn | Chạy Vite và build dự án. |
| pnpm | Theo `packageManager` trong `package.json` | Đồng bộ dependency lockfile. |
| Supabase | Một project có quyền owner/admin | Tạo Auth, chạy schema và quản lý RLS. |
| Domain | HTTPS trước khi mở bán | Cần cho Auth redirect, bảo mật trình duyệt và trải nghiệm thanh toán. |

Tạo repository public chỉ khi bạn đã kiểm tra secret. Dù **publishable/anon key** được thiết kế để xuất hiện ở client, RLS phải được bật và đúng policy; tuyệt đối không đưa `service_role key` lên GitHub hay vào JavaScript trình duyệt.[1]

## 3. Lấy mã nguồn và chạy local

### 3.1 Clone và cài dependency

```bash
git clone https://github.com/<github-user>/<repository>.git
cd <repository>
pnpm install
```

Khởi động môi trường phát triển:

```bash
pnpm dev
```

Sau khi Vite khởi động, mở `http://localhost:3000/` cho storefront, `http://localhost:3000/admin.html` cho Command Deck và `http://localhost:3000/info.html` cho trang nội dung.

### 3.2 Các lệnh chính

| Lệnh | Mục đích | Khi sử dụng |
| --- | --- | --- |
| `pnpm dev` | Chạy Vite có hot reload. | Phát triển giao diện. |
| `pnpm build` | Build các entrypoint vào `dist/public`. | Bắt buộc trước khi phát hành. |
| `pnpm preview` | Xem nhanh Vite build. | Rà soát static output. |
| `pnpm start` | Phục vụ bản build bằng server Node đi kèm. | Chạy môi trường tương thích Node. |
| `pnpm check` | Kiểm tra TypeScript của template. | Trước pull request/release. |
| `pnpm format` | Format source bằng Prettier. | Trước khi commit thay đổi lớn. |

> `dist/public` là output production. Không commit `node_modules`, `dist`, `.env*`, log, cache hay file cấu hình cục bộ đã được `.gitignore` loại trừ.

### 3.3 Cấu trúc cần biết

```text
client/
├── index.html                 # storefront
├── app.js                     # Auth, catalog, cart, checkout, QR/Zalo
├── style.css                  # giao diện storefront
├── admin.html / admin.js      # Command Deck
├── info.html                  # trang thông tin/chính sách
├── article.html / article.js  # trang đọc bài viết public
└── supabase-config.js         # Project URL + publishable key

docs/                          # tài liệu vận hành public
supabase-unified.sql           # schema canonical
ASSET_MANIFEST.md              # inventory media và checksum
vite.config.ts                 # multi-page Vite build
```

## 4. Kết nối Supabase từ đầu

### 4.1 Tạo project và lấy thông tin public

Tạo một project tại [Supabase Dashboard](https://supabase.com/dashboard), chờ trạng thái hoạt động, rồi lấy hai giá trị ở **Project Settings → API**:

| Giá trị | Dùng ở đâu | Có được public? |
| --- | --- | --- |
| Project URL | `client/supabase-config.js` | Có. |
| Publishable key hoặc legacy anon key | `client/supabase-config.js` | Có, khi RLS đúng. |
| Service role key | Chỉ backend bảo mật/quy trình quản trị chuyên biệt. | **Không.** |

Điền URL và publishable key của **project riêng của bạn**:

```js
// client/supabase-config.js
export const SUPABASE_URL = "https://your-project-id.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_your_public_key";
```

Không đổi tên export nếu chưa đồng thời sửa `client/app.js` và `client/admin.js`.

### 4.2 Áp dụng schema canonical

Trên **project mới hoặc hoàn toàn trống**, mở **SQL Editor** của Supabase, dán toàn bộ nội dung file [`../supabase-unified.sql`](../supabase-unified.sql) và chạy **một lần**.

Schema tạo các thành phần sau:

| Nhóm | Thành phần |
| --- | --- |
| Catalog | `products` với SKU, giá, sale, tồn kho, trạng thái bán và `technical_specs`. |
| Đơn hàng | `orders`, `order_items`, trạng thái thanh toán, giao nhận, tracking và ghi chú. |
| Quản trị | `admin_users`, hàm `is_admin()` và policy Command Deck. |
| CMS | `site_settings`, `site_pages`, `faqs`, `shops`. |
| Khuyến mại | `sale_campaigns`, mã sale và `create_order_with_sale`. |
| Account Center | Hồ sơ khách, số dư, sổ cái, cảnh cáo, yêu cầu nạp tiền Zalo và audit log. |
| Role & nội dung | `user_roles`, review/bình luận moderation, bài viết draft/pending/published và article reader. |
| Affiliate & hoàn tiền | Referral được duyệt, hoa hồng 15% cấu hình được, `refund_requests`, hoàn wallet/manual và CSV quản trị. |
| Bảo mật | RLS, policy catalog công khai, quyền user-own-order, giới hạn RPC checkout và kiểm tra trạng thái account. |

> **Repository chỉ giữ một file SQL:** `supabase-unified.sql`. Nếu database đã có đơn hàng thật, không chạy lại toàn bộ file; hãy tạo thay đổi DDL có quản lý từ schema canonical sau khi sao lưu. Lệnh `pnpm check` và `pnpm build` tự chạy `scripts/check-single-sql.mjs` để dừng quy trình nếu repository xuất hiện thêm bất kỳ file `.sql` nào.

Sau khi áp dụng thành công, nên thấy **25 bảng public**. Seed mặc định gồm 6 product, 2 campaign, 1 site setting, 6 trang nội dung, 3 FAQ, 3 shop và các role hệ thống; các sản phẩm seed được gán vào `shop_id` theo gian hàng. Hãy thay dữ liệu demo trước khi kinh doanh.

### 4.3 Kiểm tra RLS và checkout

RLS áp dụng trong PostgreSQL ở mỗi lần truy cập dữ liệu; policy không phải là thay thế cho việc quản lý quyền database.[2] Đặc biệt:

- Khách chưa đăng nhập chỉ đọc sản phẩm `is_active = true`, nội dung công khai, FAQ đã publish, shop đang hoạt động và sale đang diễn ra.
- Người đã đăng nhập chỉ đọc đơn hàng của chính họ.
- `create_order_with_sale` chạy transaction để lấy lại giá/tồn kho từ database thay vì tin giá do browser gửi lên.
- RPC checkout chỉ dành cho `authenticated`; quyền `anon` đã bị thu hồi.

Sau thay đổi RLS, hãy tải lại storefront ở chế độ ẩn danh, kiểm tra catalog có hiện và không có lỗi `42501` hoặc `permission denied`.

## 5. Cấu hình xác thực email

### 5.1 Bật Email/Password

Vào **Authentication → Sign In / Providers** và kiểm tra **Email = Enabled**. Supabase hosted project hỗ trợ quyết định có yêu cầu xác nhận email trước lần đăng nhập đầu tiên hay không.[3]

### 5.2 Chọn chính sách Confirm email

| Chính sách | Cách thiết lập | Phù hợp khi | Lưu ý |
| --- | --- | --- | --- |
| Bắt buộc xác nhận email | Bật `Confirm email`. | Store chính thức, giảm rủi ro email giả. | Cần cấu hình redirect URL và SMTP production. |
| Đăng ký dùng ngay | Tắt `Confirm email` rồi **Save changes**. | Demo, nội bộ hoặc cần onboarding thật nhanh. | Tăng rủi ro spam/tài khoản rác; cần rate limit và giám sát. |

Thiết lập NEXORA hiện tại chọn **tắt Confirm email**, nên user mới có thể đăng ký và đăng nhập ngay. Nếu bật lại, bổ sung domain production vào **Authentication → URL Configuration** trước khi gửi email xác nhận/reset password. Supabase ghi nhận dịch vụ gửi email mặc định chỉ phù hợp để thử nghiệm, có giới hạn; production nên dùng SMTP riêng.[3]

### 5.3 Luồng frontend

Storefront dùng `supabase.auth.signUp()` để đăng ký, `supabase.auth.signInWithPassword()` để đăng nhập và `resetPasswordForEmail()` cho **Quên mật khẩu**. Khi không yêu cầu xác nhận email, session có thể được cấp ngay sau đăng ký nếu thông tin hợp lệ. Không lưu mật khẩu, JWT hay service role key vào local file ngoài cơ chế session của Supabase Auth.

### 5.4 Khắc phục link email trỏ về `localhost`

> `localhost` chỉ phù hợp lúc phát triển. Email xác nhận, đổi email và Quên mật khẩu ở production phải quay về một origin HTTPS công khai đã được cho phép tại Supabase.[4]

NEXORA có fallback production hiện tại là `https://nexorashop-gpjdasbm.manus.space`. Nếu đã có domain riêng, ví dụ `https://shop.example.vn`, admin vào **Command Deck → Email & Domain**, nhập URL đó rồi lưu. Workspace này đồng bộ giá trị public URL để frontend luôn truyền redirect production; nó từ chối `localhost`, preview `*.manus.computer`, HTTP không mã hóa và URL có thông tin đăng nhập.

Sau đó bắt buộc mở Supabase Dashboard → **Authentication → URL Configuration** và đặt các giá trị tương ứng. Thay `shop.example.vn` bằng domain thật của bạn; với domain Manus hiện tại, dùng `nexorashop-gpjdasbm.manus.space`.

| Trường trong Supabase | Giá trị ví dụ | Mục đích |
| --- | --- | --- |
| **Site URL** | `https://shop.example.vn` | URL mặc định cho các email Auth. |
| **Redirect URLs** | `https://shop.example.vn/**` | Cho phép các callback tại website production. |
| Redirect tạm thời khi chuyển domain | `https://nexorashop-gpjdasbm.manus.space/**` | Giữ link cũ còn hoạt động trong giai đoạn chuyển đổi. |
| Không được dùng production | `http://localhost:3000/**` | Chỉ dùng local development, không đưa vào luồng email thật. |

Sau khi lưu, mở website production, dùng **Quên mật khẩu**, rồi kiểm tra link trong email bắt đầu bằng domain đã chọn. Nếu Supabase báo `redirect_to is not allowed`, kiểm tra lại đúng protocol `https`, không có slash/domain khác và wildcard `/**` trong danh sách Redirect URLs.[4]

### 5.5 Gắn domain thật vào website

Trong trang quản trị hosting của Manus, mở **Settings → Domains**, thêm hoặc gán domain. Nhà cung cấp domain sẽ yêu cầu bản ghi DNS; thường là CNAME hoặc A/ALIAS tùy hướng dẫn hiển thị trong giao diện. Chờ DNS xác minh và chứng chỉ HTTPS được cấp trước khi dùng URL đó làm **Site URL**. Không xóa domain Manus mặc định cho đến khi thử thành công đăng nhập, Quên mật khẩu, đổi email và mở lại link từ một cửa sổ ẩn danh.

Quy trình triển khai an toàn là: gắn domain → chờ HTTPS → nhập domain tại **Email & Domain** → cập nhật **Site URL/Redirect URLs** trong Supabase → gửi email test → chỉ sau đó công bố domain mới. Không cần sửa `SUPABASE_URL` hoặc anon key khi chỉ thay domain storefront.

### 5.6 Custom SMTP qua Admin nhưng không lộ secret

**Command Deck → Email & Domain** cho phép admin quản lý dữ liệu không bí mật: public URL, tên/email người gửi, provider, SMTP host/port và username. Mật khẩu SMTP, API key Resend/Postmark, `service_role key` và hook secret **không được nhập hoặc lưu trong form này**. Browser và `site_settings` không phải nơi an toàn cho secret.

| Phương án | Cấu hình thực hiện | Khi dùng |
| --- | --- | --- |
| SMTP của Supabase | Supabase Dashboard → **Authentication → SMTP Settings**; điền host, port, username, password/app password và sender đã xác minh. | Muốn Supabase gửi email Auth trực tiếp. |
| Resend/Postmark Send Email Hook | Deploy Edge Function dùng API key ở server secret, tạo `SEND_EMAIL_HOOK_SECRET`, rồi bật **Authentication → Hooks → Send Email**. | Muốn kiểm soát provider/template qua hook. |
| Provider SMTP khác | Xác minh sender/DNS theo provider, cấu hình trong SMTP Settings, thử reset password. | Provider email doanh nghiệp riêng. |

Với mọi provider, hoàn thành bản ghi DNS **SPF** và **DKIM** do provider cấp; cân nhắc thêm **DMARC** sau khi đã xác minh luồng gửi. Workspace hiển thị trạng thái “Chờ cấu hình secret/Dashboard” cho đến khi người vận hành hoàn tất thao tác này ngoài frontend. Không được tự đánh dấu đã gửi thành công khi chưa có một email test thực tế.[5]

#### Kích hoạt SMTP nhanh với domain của bạn

Người dùng khác chỉ cần thay mọi chỗ có `<YOUR_DOMAIN>` bằng domain HTTPS đã xác minh của họ, ví dụ `shop.example.vn`. Không dùng `localhost`, URL preview hoặc thêm đường dẫn vào biến domain.

| Vị trí | Giá trị cần nhập |
| --- | --- |
| Command Deck → **Email & Domain** → URL website công khai | `https://<YOUR_DOMAIN>` |
| Supabase → Authentication → URL Configuration → **Site URL** | `https://<YOUR_DOMAIN>` |
| Supabase → Authentication → URL Configuration → **Redirect URLs** | `https://<YOUR_DOMAIN>/**` |
| Supabase → Authentication → SMTP Settings → Sender email | `support@<YOUR_DOMAIN>` hoặc sender đã xác minh bởi provider |

Sau đó bật **Enable Custom SMTP** trong **Authentication → SMTP Settings**, rồi nhập host, port (thường `587`), username và password/app password do provider cấp. Password chỉ nhập tại Supabase Dashboard; không nhập vào Command Deck hoặc commit vào GitHub. Cuối cùng, vào **Authentication → Email Templates → Reset Password**, dán HTML đã sao chép từ Command Deck rồi dùng **Quên mật khẩu** để gửi một email test. Nếu link vẫn sai domain, rà soát lại đúng ba giá trị `https://<YOUR_DOMAIN>` ở bảng trên.[4] [5]

### 5.7 Chỉnh mẫu email Quên mật khẩu

Admin mở **Command Deck → Email & Domain → Chỉnh form email Quên mật khẩu** để sửa subject, preheader, heading, nội dung, nhãn CTA và footer. Form có preview và nút **Sao chép HTML Supabase**. Sau khi lưu mẫu, sao chép HTML, mở **Supabase Dashboard → Authentication → Email Templates → Reset Password**, dán HTML và lưu.

> Không xóa hoặc thay bằng URL tự tạo cho `{{ .ConfirmationURL }}`. Đây là placeholder do Supabase thay bằng link recovery đã ký; NEXORA luôn chèn nó vào nút CTA khi tạo HTML preview.[4]

Mẫu được lưu có audit log và chỉ admin đọc/chỉnh sửa. Việc lưu mẫu trong Command Deck chưa tự xuất bản template vào Supabase Dashboard, vì thao tác đó thuộc cấu hình Auth bên ngoài browser và cần người vận hành xác nhận.

### 5.8 Đóng và xóa tài khoản khách

Supabase lưu mật khẩu dưới dạng băm; admin không thể xem hay khôi phục mật khẩu plaintext. Admin chỉ có thể gửi link reset, còn khách có nút **Quên mật khẩu** ở modal đăng nhập và đổi mật khẩu trong Account Center.

Vì đơn hàng, sổ cái ví và yêu cầu nạp cần được giữ để đối soát, NEXORA dùng **đóng và ẩn danh hóa có kiểm tra** thay cho xóa cứng Auth. Khách gửi yêu cầu tại **Account Center → Bảo mật → Yêu cầu đóng tài khoản**; hệ thống khóa giao dịch ngay. Admin chỉ có thể đóng khi số dư bằng 0 và không còn đơn đang xử lý/giao nhận. Khi đủ điều kiện, profile được đổi sang `deactivated`, thông tin hiển thị/email storefront được ẩn danh và audit log được giữ lại.

## 6. Cấp quyền Command Deck

Không có tài khoản/mật khẩu admin mặc định. Quy trình an toàn là:

1. Tạo tài khoản thật ở storefront bằng email và mật khẩu mạnh.
2. Mở **Supabase SQL Editor**.
3. Chạy câu lệnh dưới đây, thay email ví dụ bằng email vừa đăng ký.
4. Đăng nhập bằng email đó tại `/admin.html`.

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@yourdomain.com'
on conflict (user_id) do nothing;
```

Để thu hồi quyền, xóa user ID tương ứng khỏi `public.admin_users`; không xóa `auth.users` trừ khi bạn thực sự muốn vô hiệu hóa cả tài khoản khách. Xem thêm [Thiết lập admin](../ADMIN_SETUP.md).

## 7. Cấu hình thanh toán và Zalo

### 7.1 Payment config

Mở đầu file `client/app.js` có block sau:

```js
const PAYMENT_CONFIG = {
  bankId: "MB",
  accountNumber: "0123456789",
  accountName: "NEXORA TECH STORE",
  momoPhone: "0900000000",
};
```

Thay placeholder bằng thông tin nhận tiền của đơn vị vận hành trước khi mở bán. Mỗi đơn được tạo trước, sau đó UI hiển thị QR VietQR hoặc chỉ dẫn MoMo. Admin mới là người đối soát và chuyển payment status; website **không tự động xác minh giao dịch ngân hàng**.

> Nếu repository là public, không commit số tài khoản cá nhân hoặc dữ liệu thanh toán nhạy cảm nếu bạn không muốn nó hiển thị công khai. Với vận hành thật, nên chuyển thông tin này sang config riêng hoặc đọc từ CMS có RLS admin.

### 7.2 Zalo xác nhận và liên hệ người bán

Command Deck có phần CMS để quản lý `zalo_phone`, `zalo_confirmation_message`, `seller_zalo_phone`, nhãn CTA và thông tin liên hệ ở footer. Dùng số theo định dạng quốc tế mà URL Zalo yêu cầu, ví dụ `84xxxxxxxxx`, thay vì tự thêm số điện thoại vào HTML rải rác.

## 8. Media, GitHub và public repository

### 8.1 Quy ước asset

| Nơi lưu | Nội dung | Quy tắc |
| --- | --- | --- |
| Nhánh `main` | Source, SQL, tài liệu. | Không đưa binary lớn vào code bundle. |
| Nhánh `assets/media` | Backup ảnh/logo/category/product. | Cập nhật manifest và checksum khi thêm file. |
| `/manus-storage/...` | URL mà storefront đang tham chiếu. | Tối ưu cho môi trường deploy hiện tại. |
| CDN/Storage riêng | Lựa chọn khi deploy ngoài môi trường hiện tại. | Dùng URL HTTPS ổn định, có quyền truy cập công khai phù hợp. |

Danh sách đầy đủ asset, SHA-256 và nguồn backup ở [Asset Manifest](../ASSET_MANIFEST.md). Không sao chép ảnh/video lớn vào `client/public` hoặc `client/src/assets`, vì chúng làm bundle và deployment nặng hơn.

### 8.2 Checklist trước khi public GitHub

- Kiểm tra `git status` và `.gitignore`; không commit `.env*`, `node_modules`, `dist/`, log hay file tải về cục bộ.
- Chỉ giữ **publishable/anon key** ở client; xoay key ngay nếu lỡ đẩy `service_role`, access token, mật khẩu hoặc thông tin ngân hàng thật.
- Xóa dữ liệu khách hàng, đơn hàng, email thật, token QR và bản export database khỏi repository.
- Kiểm tra quyền dùng ảnh sản phẩm/logo; ảnh tham chiếu từ bên thứ ba cần tuân thủ license/điều khoản nguồn.
- Thêm mô tả repo, license, screenshot không chứa dữ liệu cá nhân và link tới tài liệu này.

## 9. Build và triển khai

### 9.1 Kiểm tra build

```bash
pnpm check
pnpm build
pnpm preview
```

Build thành công tạo `dist/public` với `index.html`, `admin.html`, `info.html`, `article.html` và asset đã bundle. Test tối thiểu cả bốn URL trước release.

### 9.2 Lựa chọn hosting

| Phương án | Phù hợp | Điều cần chú ý |
| --- | --- | --- |
| Manus built-in hosting | Production hiện tại của project. | Hỗ trợ workflow storage đang dùng, custom domain và auto-publish theo checkpoint. |
| Static host có build | Cloudflare Pages, Netlify, GitHub Pages hoặc tương đương. | Build command: `pnpm build`; publish directory: `dist/public`. |
| Node-capable host | Khi cần dùng `pnpm start`. | Build trước, rồi chạy process server. |

GitHub là nơi public source, không tự thay thế storage proxy `/manus-storage`. Nếu đưa site sang host khác, hãy chuyển các URL media sang CDN/Storage công khai hoặc thay URL trong CMS/source trước khi phát hành. Cấu hình domain thật cũng phải được thêm vào Supabase **URL Configuration** nếu dùng email confirmation hoặc reset password.

### 9.3 Luồng commit khuyến nghị

```bash
git checkout main
git pull --ff-only
git add README.md docs/ supabase-unified.sql client/
git commit -m "docs: update deployment guide"
git push origin main
```

Media mới được commit riêng ở branch `assets` để không làm nặng nhánh source:

```bash
git checkout assets
git add media/ ASSET_MANIFEST.md
git commit -m "chore(assets): archive storefront media"
git push origin assets
```

## 10. Vận hành hằng ngày

### 10.1 Command Deck

| Khu vực | Việc quản trị viên có thể làm |
| --- | --- |
| Tổng quan | Xem chỉ số đơn, doanh thu theo dữ liệu đơn và hoạt động gần đây. |
| Sản phẩm | Tạo/sửa/xóa, thay SKU, giá, tồn kho, sale, featured, thông số kỹ thuật, trạng thái bán. |
| Đơn hàng | Xem chi tiết, cập nhật thanh toán, fulfillment, carrier, tracking, ghi chú. |
| Thương hiệu/CMS | Đổi tên site, banner, logo, contact, Zalo và hero. |
| Nội dung & FAQ | Quản lý trang thông tin, FAQ, điều khoản, bảo mật và chính sách. |
| Gian hàng/Sale | Quản lý shop, liên hệ shop và campaign giảm giá. |
| Role & kiểm duyệt | Gán role theo phân cấp, duyệt affiliate, review, bình luận và bài viết. |
| Hoàn tiền & CSV | Xử lý refund theo quy trình đối soát và xuất sổ cái/nạp tiền cho admin. |
| Cấu hình nâng cao | Payment config, favicon và hiệu ứng tuyết/cánh hoa storefront. |

Tỷ lệ affiliate mặc định là 15%, nhưng **admin** có thể thay đổi trong **Cấu hình nâng cao** cùng điều kiện đơn delivered và yêu cầu duyệt. Hệ thống không áp dụng hồi tố lên commission đã được ghi; hãy đối soát trước khi điều chỉnh tỷ lệ trên store đang vận hành.

### 10.2 Quy trình xử lý đơn đề xuất

1. Khách tạo đơn, trạng thái bắt đầu là `pending_payment`.
2. Khách chuyển khoản và gửi mã đơn qua Zalo nếu CTA đã được cấu hình.
3. Admin đối soát số tiền, cập nhật `paid`/ghi chú xác nhận.
4. Chuyển fulfillment lần lượt: `unfulfilled → preparing → ready_to_ship → shipped → delivered`.
5. Cập nhật carrier/tracking code khi giao cho đơn vị vận chuyển.
6. Nếu có hoàn trả, ghi rõ ghi chú và dùng trạng thái `returned` theo quy trình nội bộ.

Không đánh dấu `paid` chỉ dựa vào nội dung tin nhắn; cần đối chiếu giao dịch thực tế.

## 11. Kiểm thử trước khi mở bán

| Hạng mục | Cách kiểm tra | Kết quả mong đợi |
| --- | --- | --- |
| Catalog ẩn danh | Mở storefront bằng cửa sổ ẩn danh. | Sản phẩm active, FAQ/shop published và sale hợp lệ hiển thị. |
| Đăng ký/Auth | Đăng ký bằng email test. | Với Confirm email tắt, có thể đăng nhập ngay. |
| Phân quyền | Dùng user thường mở `/admin.html`. | Bị chặn Command Deck. |
| Admin | Cấp `admin_users`, đăng nhập lại. | Tải được dashboard và CRUD đúng phạm vi. |
| Cart/checkout | Thêm sản phẩm có tồn kho, checkout. | Đơn tạo qua RPC, tổng tiền lấy từ database. |
| Tồn kho | Thử số lượng vượt stock. | Database từ chối, không tạo đơn sai. |
| Sale code | Thử mã còn hạn và mã sai/hết hạn. | Chỉ mã hợp lệ được giảm. |
| QR/Zalo | Kiểm tra cấu hình payment thật. | Thông tin người nhận, tổng tiền và mã đơn chính xác. |
| RLS | Dùng user A thử truy cập đơn user B. | Không đọc/cập nhật được. |
| Role/moderation | Dùng customer/moderator/admin tách biệt. | Customer bị chặn Command Deck; moderator không đổi `admin`; nội dung chỉ public sau duyệt. |
| Affiliate/refund | Dùng tài khoản test và đơn không có tiền thật. | Hoa hồng đúng 15% khi delivered; refund wallet thay đổi ledger/balance đồng thời. |
| Build | Chạy `pnpm build`. | Không có lỗi build; cả `/`, `/admin.html`, `/info.html`, `/article.html` mở được. |

## 12. Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Storefront hiển thị demo/fallback | URL/key Supabase sai, RLS sai hoặc query bị chặn. | Kiểm tra `supabase-config.js`, Auth API URL, browser Network và policy `products`. |
| `permission denied for function is_admin` | Policy public gọi hàm admin không phù hợp cho `anon`. | Dùng policy public chỉ kiểm tra `is_active = true`; giới hạn policy admin ở role `authenticated`. |
| Không vào được Command Deck | User chưa có bản ghi trong `admin_users`. | Chạy câu lệnh cấp quyền ở mục 6 rồi đăng nhập lại. |
| Đơn không tạo được | User chưa login, item hết hàng, sale code sai hoặc RPC chưa áp dụng. | Kiểm tra session, stock, campaign ngày/limit và `supabase-unified.sql`. |
| Không xuất hiện QR | `PAYMENT_CONFIG` còn placeholder. | Điền dữ liệu thanh toán thật và refresh build/deploy. |
| Xác nhận email không như ý | `Confirm email` không đúng trạng thái. | Vào Authentication → Sign In / Providers, đổi switch rồi Save changes. |
| Ảnh mất khi deploy ngoài môi trường hiện tại | URL `/manus-storage` không có storage proxy trên host mới. | Chuyển ảnh sang CDN/Storage công khai và cập nhật CMS/source. |
| Admin thấy số liệu bất thường | Đơn demo hoặc payment/fulfillment status chưa được cập nhật nhất quán. | Kiểm tra dữ liệu đơn, filter thời gian và trạng thái trong Command Deck. |

## 13. An toàn dữ liệu và checklist production

### 13.1 Bảo mật tối thiểu

RLS và quyền database cần được kiểm thử cùng nhau: policy quyết định dòng nào được phép, còn grant quyết định role có được thực hiện thao tác hay không.[2] Vì vậy, không tắt RLS chỉ để “sửa nhanh” lỗi frontend.

| Việc bắt buộc | Trạng thái trước production |
| --- | --- |
| RLS bật cho toàn bộ bảng public | Hoàn thành. |
| `anon` không chạy được checkout RPC | Hoàn thành. |
| Publishable key ở browser, không có service role | Hoàn thành. |
| Tài khoản admin không dùng password mặc định | Hoàn thành. |
| Đặt rate limit/CAPTCHA nếu tắt Confirm email | Khuyến nghị mạnh. |
| SMTP riêng nếu dùng email confirmation/reset production | Khuyến nghị mạnh. |
| Backup schema/data trước thay đổi DDL | Bắt buộc. |
| Rà soát legal pages và chính sách thanh toán | Bắt buộc trước mở bán thật. |

### 13.2 Bảo trì schema

`supabase-unified.sql` là nguồn SQL chuẩn duy nhất cho **fresh install**. Với production có dữ liệu, tạo migration DDL có quản lý từ chênh lệch canonical và thử ở staging trước; không thêm file SQL rời vào repository.

### 13.3 Tài liệu liên quan

| Tài liệu | Mục đích |
| --- | --- |
| [README](../README.md) | Tổng quan kỹ thuật và lệnh nhanh. |
| [Quy trình Supabase](SUPABASE.md) | Database, RLS, checkout và cấp admin. |
| [Thiết lập admin](../ADMIN_SETUP.md) | Quy trình Command Deck ngắn gọn. |
| [Vận hành Account & Wallet](ACCOUNT_WALLET.md) | Số dư, nạp tiền Zalo, khóa/cảnh cáo và audit log. |
| [Role, Content & Affiliate](ROLE_CONTENT_AFFILIATE.md) | Ma trận quyền, moderation, affiliate 15%, hoàn tiền và CSV. |
| [Asset Manifest](../ASSET_MANIFEST.md) | Media backup và checksum. |
| [Chỉ mục tài liệu](INDEX.md) | Điểm điều hướng toàn bộ Markdown. |

---

## Tài liệu tham khảo

[1] [Supabase — API Keys](https://supabase.com/docs/guides/api/api-keys)

[2] [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

[3] [Supabase — Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
