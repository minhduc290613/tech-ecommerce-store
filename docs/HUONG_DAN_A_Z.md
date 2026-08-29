# NEXORA Tech Store — Hướng dẫn triển khai và sử dụng từ A–Z

> **Phiên bản tài liệu:** 2026-08-29. Tài liệu áp dụng cho source hiện tại của NEXORA Tech Store, một ứng dụng thương mại điện tử đa trang dùng Vanilla JavaScript, Vite, Supabase và Node.js/Express. Tài liệu có thể đưa lên GitHub công khai vì toàn bộ giá trị bí mật đều được minh họa bằng placeholder.

## 1. NEXORA là gì?

NEXORA gồm storefront dành cho khách mua hàng và **NEXORA Command Deck** dành cho đội ngũ vận hành. Storefront chạy theo kiến trúc HTML5, CSS3 và JavaScript ES Modules; Supabase cung cấp Auth, PostgreSQL, RLS, Storage và RPC. Vite đóng gói nhiều entrypoint, còn server Node/Express phục vụ bản production và các route backend như tRPC, webhook thanh toán hoặc email giao dịch.

> **Nguyên tắc bảo mật quan trọng:** publishable key/legacy anon key có thể xuất hiện trong frontend, nhưng `service_role`, secret key, JWT secret, SMTP password, API key thanh toán và thông tin tài khoản nhận tiền thật không được đưa vào GitHub, HTML, JavaScript trình duyệt hoặc file Markdown công khai. Supabase xác định publishable key là giá trị dành cho môi trường public; quyền thực tế vẫn phải được bảo vệ bởi Auth và RLS [1].

## 2. Các trang và tính năng

| Khu vực | Đường dẫn | Chức năng chính |
| --- | --- | --- |
| Storefront | `/` | Catalog, tìm kiếm, lọc, Flash Sale, Săn sale, Quick View, gallery ảnh, giỏ hàng và checkout. |
| Account Center | Mở từ nút tài khoản | Hồ sơ, username, mật khẩu, số điện thoại, sổ nhiều địa chỉ, số dư, sổ cái và thông báo. |
| Đơn hàng | `/orders.html` | Danh sách, chi tiết, thanh toán, giao nhận, nhà vận chuyển, mã vận đơn, nơi hàng đã đến, hủy/trả hàng theo điều kiện. |
| Affiliate | `/affiliate.html` | Link giới thiệu, lượt click, đơn đủ điều kiện và hoa hồng của affiliate đang đăng nhập. |
| Nội dung | `/info.html` | Giới thiệu, FAQ, điều khoản, bảo mật, giao hàng, đổi trả và liên hệ. |
| Bài viết | `/article.html?slug=<slug>` | Bài viết đã được duyệt xuất bản; quyền viết và kiểm duyệt phụ thuộc role. |
| Command Deck | `/admin.html` | Dashboard, catalog, đơn hàng, tài khoản, role, CMS, giao nhận, sale, email, thông báo và xuất CSV. |

### 2.1 Storefront và checkout

Khách có thể duyệt sản phẩm mà không đăng nhập. Catalog hỗ trợ tìm kiếm, lọc danh mục, lọc khoảng giá, lọc sản phẩm sale, lazy loading ảnh và trạng thái retry khi mạng chậm. Giỏ hàng được lưu trên trình duyệt để giữ lại giữa các lần xem trang. Checkout yêu cầu đăng nhập, số điện thoại và địa chỉ giao hàng.

Khi tạo đơn, frontend gọi RPC checkout; database tự đọc lại giá, tồn kho và điều kiện sale thay vì tin vào số tiền do browser gửi. Thanh toán bằng số dư chỉ chuyển sang thành công khi RPC xác nhận đủ tiền. Chuyển khoản QR/ZaloPay là quy trình đối soát: khách quét mã, sao chép nội dung chuyển khoản, nhắn shop nếu được cấu hình, sau đó nhân viên hoặc Admin xác nhận trong Command Deck.

### 2.2 Thông báo

Header storefront có chuông và badge chưa đọc cạnh mục **Đơn hàng**. Trung tâm thông báo hợp nhất cập nhật đơn hàng với broadcast của cửa hàng; khách có thể mở từng mục, dùng CTA và đánh dấu đã đọc. Admin hoặc MKT có workspace **Phát thông báo** để gửi toàn server hoặc một người cụ thể. Broadcast toàn server luôn yêu cầu xác nhận trước khi gửi và lịch sử phát chỉ hiển thị metadata cần thiết.

### 2.3 Command Deck và phân quyền

| Role/capability | Phạm vi điển hình |
| --- | --- |
| Admin | Toàn bộ chức năng vận hành, role, CMS, tài khoản, tài chính nội bộ, thông báo broadcast và cấu hình hệ thống. |
| Moderator | Kiểm duyệt bình luận/đánh giá, bài viết và các chức năng được Admin cấp. |
| MKT/Marketing | Bài viết, chiến dịch sale và phát thông báo theo capability được cấp. |
| Order manager | Duyệt/xử lý đơn trong phạm vi được cấp. |
| Logistics/nhân viên kiểm hàng | Cập nhật nhà vận chuyển, mã vận đơn, timeline và điểm đến theo capability. |
| Affiliate | Chia sẻ link affiliate và xem số liệu của chính mình sau khi đủ điều kiện. |
| User | Mua hàng, quản lý tài khoản, địa chỉ, số dư, đơn hàng và thông báo của chính mình. |

RLS và RPC là lớp bảo vệ bắt buộc. Không cấp quyền bằng cách chỉ ẩn nút frontend; mỗi thao tác nhạy cảm phải được kiểm tra lại ở PostgreSQL.

## 3. Yêu cầu trước khi cài đặt

| Thành phần | Khuyến nghị | Ghi chú |
| --- | --- | --- |
| Git | Bản mới | Dùng để clone và cập nhật source. |
| Node.js | 20 LTS hoặc 22 LTS | Phù hợp với Vite, esbuild và server hiện tại. |
| pnpm | Phiên bản tương thích lockfile | Dùng `pnpm install`, không trộn npm/yarn nếu không cần. |
| Supabase | Một project riêng | Cần quyền tạo schema, Auth, Storage và RLS. |
| Domain | HTTPS | Cần cho Auth redirect và production. |
| Hosting | Static hoặc Node.js | Chọn theo việc có cần server route/email/webhook hay không. |

GitHub Pages, Netlify, Vercel static, Cloudflare Pages và cPanel static hosting phù hợp với bản `dist/public`. aaPanel, VPS Ubuntu và cPanel có Passenger phù hợp khi cần chạy Node server. GitHub Pages không chạy server-side PHP, Ruby hoặc Python; vì vậy không thể thay thế Node backend [2].

## 4. Clone GitHub và chạy local

### 4.1 Clone repository

Thay placeholder bằng repository của bạn:

```bash
git clone https://github.com/minhduc290613/tech-ecommerce-store.git
cd <repository>
```

Nếu repository đã có source local:

```bash
git remote -v
git pull origin main
```

### 4.2 Cài dependency và chạy development

```bash
pnpm install
pnpm dev
```

Mở các trang sau:

| Trang | URL local |
| --- | --- |
| Storefront | `http://localhost:3000/` |
| Command Deck | `http://localhost:3000/admin.html` |
| Đơn hàng | `http://localhost:3000/orders.html` |
| Affiliate | `http://localhost:3000/affiliate.html` |
| Thông tin | `http://localhost:3000/info.html` |

Port mặc định là 3000, nhưng server có thể tự tìm port kế tiếp nếu port đó bận. Không hardcode port trong reverse proxy; hãy đọc port được hiển thị trong terminal.

### 4.3 Các lệnh dự án

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm dev` | Chạy Node/Express ở development và kết nối Vite hot reload. |
| `pnpm test` | Chạy toàn bộ Vitest regression suite. |
| `pnpm check` | Kiểm tra SQL layout và TypeScript. |
| `pnpm build` | Kiểm tra SQL, build các trang vào `dist/public` và bundle server vào `dist/index.js`. |
| `pnpm start` | Chạy bản production bằng Node từ `dist/index.js`. |
| `pnpm format` | Format source bằng Prettier. |

Project hiện không cần `pnpm preview`; hãy dùng `pnpm start` để kiểm tra bản production có server hoặc mở trực tiếp thư mục `dist/public` trên static server.

## 5. Kết nối Supabase

### 5.1 Tạo project

Tạo project tại [Supabase Dashboard](https://supabase.com/dashboard), vào **Project Settings → API Keys** và lấy Project URL cùng Publishable key. Với project cũ, legacy anon key vẫn có thể dùng trong frontend nếu RLS được cấu hình đúng. Supabase khuyến nghị dùng publishable key mới cho component public và chỉ dùng secret key ở backend được bảo vệ [1].

Mở `client/supabase-config.js` và thay placeholder:

```js
export const SUPABASE_URL = "https://your-project-id.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_your_public_key";
```

Không đặt `sb_secret_...`, `service_role`, SMTP password hoặc JWT secret vào file này. File này được bundle vào browser.

### 5.2 Áp dụng database schema

Trên project Supabase mới hoặc hoàn toàn trống, mở **SQL Editor**, dán toàn bộ file `supabase-unified.sql` và chạy một lần. Repository chỉ giữ một file SQL canonical. Không chạy lại toàn bộ file trên database đã có đơn thật; hãy sao lưu trước và tạo migration có kiểm soát.

Schema bao gồm catalog, đơn hàng, order items, customer profile, wallet/ledger, địa chỉ, role/capability, CMS, FAQ, bài viết, bình luận/đánh giá moderation, affiliate, sale campaign, giao nhận, hậu mãi, email giao dịch, customer notifications và platform notifications. Sau khi chạy, kiểm tra lỗi SQL, RLS và các RPC được cấp quyền.

### 5.3 Kiểm tra Auth và RLS

Trong Supabase vào **Authentication → Sign In / Providers**, bật Email. Trong **Authentication → URL Configuration**, đặt Site URL là domain production và thêm redirect URL cho local, preview và production. Supabase Auth dùng JWT để kết hợp với RLS; token của người dùng được gửi cùng SDK request để PostgreSQL áp dụng quyền theo từng dòng [3].

Để test an toàn, tạo một tài khoản user thông thường trước. Kiểm tra user chỉ thấy đơn, địa chỉ, số dư và thông báo của chính mình. Sau đó cấp quyền Admin bằng `user_id`, không dùng mật khẩu mặc định:

```sql
insert into public.admin_users (user_id)
select id from auth.users
where email = 'admin@your-domain.example'
on conflict (user_id) do nothing;
```

Nếu hệ thống role đã được bật, hãy sử dụng workspace quản lý role hoặc RPC quản trị tương ứng; không sửa hàng loạt role bằng frontend.

## 6. Cấu hình thanh toán, email và media

### 6.1 Thanh toán QR và ZaloPay

Thông tin nhận tiền được cấu hình trong phần thanh toán/CMS theo source hiện tại. Chỉ dùng tài khoản thật sau khi kiểm tra trên một đơn giá trị nhỏ. Đơn chuyển khoản không tự động thành đã thanh toán chỉ vì khách mở modal hoặc bấm “Đã thanh toán”. Nhân viên phải đối soát giao dịch rồi cập nhật trạng thái trong Command Deck.

CK tự động qua VietQR Host2Host, SePay hoặc Casso được giữ tắt cho đến khi bạn nhập secret, webhook signing secret và endpoint production. Secret phải được nhập qua cơ chế secret của hosting/backend, không commit vào GitHub và không đưa vào `client/`.

### 6.2 SMTP và email giao dịch

Email giao dịch hỗ trợ kênh API hoặc SMTP ở backend. Admin có thể chỉnh mẫu email trong Command Deck nhưng không được xem lại secret sau khi lưu. Khi chưa đủ secret, hệ thống giữ trạng thái không gửi thật. Trước production cần xác minh sender domain, SPF, DKIM, redirect URL và test mailbox thật.

Các biến bí mật thường đặt trên server hosting gồm `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, hoặc secret API của provider theo tài liệu tích hợp hiện tại. Tên biến thực tế phải khớp `server/_core/env.ts` và tài liệu provider; không tự đoán tên khi triển khai.

### 6.3 Ảnh, logo và storage

Logo, favicon, OG image, banner, ảnh sản phẩm, ảnh bài viết và logo nhà vận chuyển có thể upload từ Command Deck hoặc nhập URL HTTPS công khai. Không commit ảnh lớn vào `client/public` nếu không cần. Asset production nên nằm trong Supabase Storage/CDN hoặc kho media đã được cấp URL ổn định. Không lưu byte file trực tiếp trong PostgreSQL.

## 7. Triển khai lên GitHub

### 7.1 Đưa source lên repository

```bash
git init
git add .
git commit -m "Initial NEXORA deployment"
git branch -M main
git remote add origin https://github.com/<github-user>/<repository>.git
git push -u origin main
```

Trước khi push, kiểm tra:

```bash
git status
git ls-files | grep -E '(^|/)(\.env|.*secret|service_role|credentials)' || true
grep -RniE 'service_role|sb_secret_|SMTP_PASSWORD|JWT_SECRET' --exclude-dir=node_modules --exclude-dir=dist . || true
```

Nếu lệnh cuối phát hiện secret thật, thay/rotate secret ngay và xóa khỏi lịch sử Git trước khi repository public. `.gitignore` không làm mất secret đã commit trước đó.

### 7.2 GitHub Pages cho bản static

GitHub Pages phù hợp khi bạn deploy artifact `dist/public`. Có thể dùng GitHub Actions để chạy `pnpm install`, `pnpm build`, sau đó publish `dist/public`. Nếu chọn deploy từ branch/folder, entrypoint `index.html` phải nằm ở đầu thư mục publish; GitHub Pages hỗ trợ static files và custom domain, nhưng không chạy Node server [2].

Ví dụ cấu hình Actions tối thiểu cần bảo đảm build output được upload từ `dist/public`. Không đặt secret backend trong workflow public. Với Auth, thêm domain GitHub Pages vào Supabase redirect URLs. Do GitHub Pages thường chạy dưới subpath `https://<user>.github.io/<repository>/`, hãy kiểm tra mọi link tuyệt đối `/admin.html`, `/orders.html` và asset path; nếu subpath gây lỗi, dùng custom domain hoặc static host phục vụ tại root domain.

### 7.3 GitHub không phải nơi lưu database production

GitHub chỉ lưu source, tài liệu và metadata asset. Database production nằm ở Supabase. Không đưa file export chứa customer PII, order thật, token, secret hoặc backup database chưa mã hóa lên repository.

## 8. Triển khai static trên Netlify/Vercel/Cloudflare/cPanel

Static deployment dùng quy trình chung:

```bash
pnpm install
pnpm test
pnpm check
pnpm build
```

Đặt **Build command** là `pnpm build` và **Publish directory** là `dist/public`. Nếu host cần Node version, chọn Node 20 hoặc 22. Sau deploy, kiểm tra đủ các file `index.html`, `admin.html`, `orders.html`, `affiliate.html`, `info.html` và `article.html`.

Static host phù hợp cho storefront và các chức năng gọi trực tiếp Supabase. Tuy nhiên, nếu bạn cần server route email, webhook thanh toán, tRPC hoặc xử lý secret, phải chạy thêm Node backend trên một dịch vụ server hoặc chuyển sang triển khai Node đầy đủ. Không đưa secret vào biến `VITE_*`, vì các biến này thường được bundle public.

## 9. Triển khai trên aaPanel Ubuntu

aaPanel có Node.js Project/PM2 để quản lý Node version, domain reverse proxy, SSL và log [4]. Quy trình sau áp dụng khi server của bạn có quyền root và đã cài aaPanel.

### 9.1 Chuẩn bị server

Trong aaPanel, cài Node.js version manager, chọn Node 20 hoặc 22 LTS, cài Git và pnpm. Tạo website/domain trước, bật SSL và trỏ DNS A/AAAA về IP server. Kiểm tra bằng SSH:

```bash
node -v
pnpm -v
git --version
```

### 9.2 Deploy bằng Node Project

Trong **Website → Node Project → Add Node Project**, chọn một trong hai cách:

| Trường | Giá trị gợi ý |
| --- | --- |
| Project path | `/www/wwwroot/nexora` |
| Git repository | URL GitHub của repository |
| Package manager | `pnpm` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Start command | `pnpm start` |
| Port | Port do biến `PORT` hoặc panel cấp, ví dụ `3000` |
| Run user | user giới hạn như `www`, không chạy production bằng root |
| Domain | domain đã trỏ DNS |

Nếu panel tách bước build và start, chạy build trước rồi start. Tạo biến môi trường server trong giao diện aaPanel, đặc biệt là `NODE_ENV=production`, `PORT`, database/server secret, SMTP và webhook secret. Không nhập publishable key server secret vào frontend nhầm tên; kiểm tra `server/_core/env.ts`.

### 9.3 Deploy bằng PM2 hoặc terminal

```bash
cd /www/wwwroot/nexora
git pull origin main
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

Nếu dùng PM2, tạo process theo command production của project, đặt working directory đúng và bật auto-start sau reboot. Trong aaPanel cấu hình reverse proxy từ domain HTTPS tới `127.0.0.1:<port>`; không mở port Node trực tiếp cho Internet nếu không cần. Khi cập nhật code, pull source, cài dependency nếu lockfile đổi, build lại và restart process.

### 9.4 Kiểm tra aaPanel

Kiểm tra ba lớp: log process Node, access/error log của reverse proxy và browser console. Nếu domain trả 502, kiểm tra process có chạy, port proxy có trùng port thật và firewall có cho phép Nginx/Apache hay không. Nếu Auth quay về localhost, kiểm tra Supabase Site URL/redirect URL và domain hiện tại, không sửa bằng cách đưa secret vào client.

## 10. Triển khai trên cPanel

Có hai cách và cần phân biệt rõ.

### 10.1 cPanel static hosting

Nếu hosting chỉ có File Manager, upload file trong `dist/public` vào `public_html`. Cách này không chạy `pnpm start`, không chạy Node backend, email server route hoặc webhook. Nó phù hợp khi frontend gọi trực tiếp Supabase và bạn không cần backend Node riêng.

Bật SSL, sau đó cập nhật Supabase Site URL/redirect URL bằng domain cPanel. Kiểm tra các entrypoint đa trang và các link absolute. Nếu host không hỗ trợ fallback, phải upload đúng `admin.html`, `orders.html`, `affiliate.html`, `info.html` và `article.html` cùng asset build.

### 10.2 cPanel Node.js Application/Passenger

cPanel Application Manager dùng Passenger làm application server/process manager/reverse proxy; nhà cung cấp phải bật Application Manager, Passenger, `mod_env` và Node version phù hợp [5]. cPanel khuyến nghị thao tác bằng user cPanel, không dùng root cho quy trình ứng dụng [6].

Quy trình tổng quát:

1. Dùng **Git Version Control** hoặc SSH để clone repository vào thư mục, ví dụ `/home/<cpanel-user>/nexora`.
2. Chọn Node 20/22 theo những version host cung cấp.
3. Chạy `pnpm install --frozen-lockfile` và `pnpm build` trong Terminal của cPanel.
4. Trong **Software → Application Manager**, đăng ký application với domain/subdomain, application path tương đối với home directory, môi trường Production và biến môi trường cần thiết.
5. Chọn startup file theo khả năng của host. Nếu Application Manager cho phép startup file tùy chỉnh, dùng entrypoint production tương ứng của project là `dist/index.js`; nếu Passenger chỉ tìm `app.js`, hỏi nhà cung cấp cách đặt `PassengerStartupFile` hoặc tạo wrapper `app.js` theo cấu hình ESM/Node của host. Không đoán wrapper khi chưa biết `package.json` và Passenger version.
6. Deploy/restart application, mở domain HTTPS và kiểm tra log application. cPanel lưu log Node trong thư mục `logs/` theo cấu hình Application Manager [5].

Passenger có thể reverse-bind port; không ép ứng dụng dùng port public cố định. Server hiện đọc `process.env.PORT`, do đó hãy dùng port do Passenger/cPanel cung cấp. Nếu application không khởi động, kiểm tra Node version, startup file, working directory, quyền đọc file, dependency và log trước khi đổi code.

## 11. Quy trình sử dụng hằng ngày

### 11.1 Khách hàng

Khách đăng ký bằng email, username hợp lệ, số điện thoại và địa chỉ. Sau khi đăng nhập, khách có thể thêm nhiều địa chỉ, chọn địa chỉ mặc định, cập nhật bảo mật, theo dõi số dư, xem sổ cái, nhận thông báo và theo dõi đơn. Trước checkout cần kiểm tra lại số điện thoại và địa chỉ vì bản sao giao nhận được lưu cùng đơn để bảo toàn lịch sử.

Khi đơn chuyển khoản được tạo, khách xem QR và nội dung chuyển khoản, sau đó liên hệ shop nếu shop yêu cầu. Khách chỉ nên coi đơn là hoàn tất sau khi trạng thái trong **Đơn hàng của tôi** được shop xác nhận. Yêu cầu hủy/trả hàng phải dùng đúng điều kiện hiển thị trên đơn; hệ thống không tự hoàn tiền chỉ vì khách gửi yêu cầu.

### 11.2 Admin/MKT

Admin đăng nhập `/admin.html`, kiểm tra **Tổng quan**, sau đó quản lý Catalog, Đơn hàng, Tài khoản, Role, CMS, Sale, Email, Logistics, Affiliate và Thông báo. MKT chỉ thấy workspace theo capability. Khi phát thông báo, chọn **Toàn server** hoặc **Một tài khoản cụ thể**, nhập tiêu đề/nội dung, kiểm tra CTA rồi xác nhận. Không gửi mật khẩu, token, thông tin thẻ, số dư chi tiết hoặc PII trong broadcast.

Đối với đơn chuyển khoản, kiểm tra giao dịch ngoài hệ thống trước khi bấm đã thanh toán. Đối với hủy đơn, trả hàng hoặc hoàn tiền, nhập ghi chú đủ rõ để audit. Không xóa cứng đơn thật và không dùng fixture test trên dữ liệu khách.

## 12. Checklist trước khi mở bán

| Kiểm tra | Kết quả cần đạt |
| --- | --- |
| Schema | `supabase-unified.sql` chạy thành công trên database đích; không chạy lại trên production có dữ liệu nếu chưa backup. |
| RLS | Bảng nhạy cảm bật RLS; user không đọc được dữ liệu người khác. |
| Auth | Đăng ký, đăng nhập, đăng xuất, recovery và redirect production hoạt động. |
| Catalog | Giá, tồn kho, sale, gallery và trạng thái bán hiển thị đúng. |
| Checkout | Giá được database tính lại; thiếu địa chỉ/số điện thoại bị chặn; đơn tạo đúng. |
| Payment | QR và thông tin nhận tiền đã thay placeholder; chuyển khoản chỉ được xác nhận sau đối soát. |
| Email | SMTP/API chưa gửi thật khi thiếu secret; sender domain và mailbox đã test nếu bật. |
| Admin | Admin login được; MKT/Moderator/Logistics chỉ có quyền đúng capability. |
| Notification | Badge, mark-read, broadcast toàn server và target user hoạt động; không lộ nội dung nhạy cảm. |
| Domain | HTTPS, Supabase Site URL, redirect URLs và callback không còn localhost. |
| Build | `pnpm test`, `pnpm check`, `pnpm build` đều đạt. |

## 13. Khắc phục lỗi phổ biến

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| `pnpm: command not found` | Chưa cài pnpm hoặc PATH chưa đúng. | Cài pnpm theo Node version manager của máy/hosting rồi mở terminal mới. |
| Catalog không tải | Sai URL/key, schema chưa chạy hoặc RLS chặn. | Kiểm tra `client/supabase-config.js`, project Supabase và browser console. |
| Không vào Admin | User chưa có `admin_users`/role phù hợp hoặc session cũ. | Cấp quyền bằng SQL/RPC an toàn, đăng xuất rồi đăng nhập lại. |
| Đơn không tạo | Chưa đăng nhập, thiếu địa chỉ/số điện thoại, tồn kho thiếu hoặc RPC lỗi. | Kiểm tra từng điều kiện; không sửa giá trong browser. |
| QR sai | Placeholder, bank ID/số tài khoản sai hoặc cấu hình chưa lưu. | Cập nhật cấu hình, test QR trước khi chạy thật. |
| Email ra localhost | Site URL/redirect URL vẫn dùng local hoặc biến môi trường production chưa được nạp. | Sửa URL trong Supabase và hosting, restart server, test recovery lại. |
| aaPanel 502 | Process Node dừng, proxy sai port hoặc chưa build. | Xem PM2/Node log, kiểm tra `PORT`, build lại và restart. |
| cPanel Passenger lỗi startup | Sai Node version, startup file hoặc application path. | Kiểm tra Application Manager, `logs/`, PassengerStartupFile và hỏi nhà cung cấp host. |
| Badge thông báo không tăng | Chưa đăng nhập, RPC notification bị chặn hoặc browser cache cũ. | Kiểm tra session, RPC/RLS, Network tab và hard refresh. |
| GitHub Pages trắng trang | Publish sai thư mục hoặc dùng subpath nhưng link absolute. | Publish `dist/public`, kiểm tra các entrypoint và dùng custom domain nếu cần. |

## 14. Bảo mật và sao lưu

Không commit `.env`, secret key, password, service role, SMTP credential, webhook signing secret, database export chứa PII hoặc tài khoản nhận tiền thật. Rotate ngay mọi secret đã lộ. Giới hạn quyền Supabase, bật RLS, xem Security Advisor, bật MFA cho tài khoản quản trị và dùng HTTPS.

Sao lưu database theo chính sách của Supabase/nhà cung cấp, lưu backup ở nơi mã hóa và kiểm tra khả năng restore định kỳ. GitHub branch chỉ là backup source; nó không thay thế backup database, Storage hoặc Auth users.

## 15. Tham khảo chính thức

[1] [Supabase — API Keys](https://supabase.com/docs/guides/getting-started/api-keys)

[2] [GitHub Docs — Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

[3] [Supabase — Auth](https://supabase.com/docs/guides/auth)

[4] [aaPanel — Node.js Project](https://www.aapanel.com/docs/Function/Node.html)

[5] [cPanel — Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/)

[6] [cPanel — How to Install a Node.js Application](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
