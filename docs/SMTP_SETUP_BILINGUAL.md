# NEXORA SMTP & Transactional Email Guide

> **Song ngữ / Bilingual:** Tài liệu này hướng dẫn cấu hình email giao dịch của NEXORA bằng SMTP hoặc Resend API, từ môi trường local đến aaPanel, cPanel và production.

## 1. Phạm vi tài liệu / Scope

NEXORA có hai nhóm email cần phân biệt. **Supabase Auth email** gồm email xác nhận, magic link và reset password do Supabase Auth quản lý. **Transactional email của NEXORA** gồm thông báo trạng thái đơn đã giao, yêu cầu hủy/trả hàng và các mẫu email giao dịch được quản lý trong Command Deck. Hai nhóm này có thể dùng các cấu hình khác nhau.

NEXORA chỉ gửi email từ backend. SMTP password, Resend API key, Supabase service-role key và JWT secret không được đưa vào HTML, JavaScript trình duyệt, `VITE_*`, GitHub hoặc file công khai.

NEXORA supports two separate email groups. **Supabase Auth email** covers confirmation, magic-link and password-reset messages managed by Supabase Auth. **NEXORA transactional email** covers delivered-order notifications, cancellation/return status messages and editable transactional templates managed in the Command Deck. These groups may use different provider settings.

NEXORA sends email only from the backend. SMTP passwords, Resend API keys, Supabase service-role keys and JWT secrets must never be placed in HTML, browser JavaScript, `VITE_*` variables, GitHub or public documentation.

## 2. Kiến trúc gửi email / Email architecture

| Thành phần / Component | Vai trò / Responsibility | Nơi cấu hình / Configuration location |
|---|---|---|
| `server/transactional-email.ts` | Kiểm tra secret, render template và gửi email / Checks secrets, renders templates and sends email | Backend only |
| SMTP | Gửi qua mailbox/domain của nhà cung cấp / Sends through a provider mailbox/domain | Server environment |
| Resend API | Gửi qua HTTPS API / Sends through an HTTPS API | Server environment |
| `email_delivery_settings` | Chọn mode, bật/tắt, sender name và public URL / Selects mode, enable flag, sender name and public URL | Supabase + Command Deck |
| `transactional_email_templates` | Lưu subject, heading, body, CTA và footer / Stores editable email content | Supabase + Command Deck |
| `/api/transactional-emails/status` | Kiểm tra backend có đủ cấu hình không / Reports backend configuration status | Server route |
| `/api/transactional-emails/dispatch` | Gửi một email trong queue sau khi kiểm tra quyền / Dispatches a queued email after authorization | Server route |

Khi chưa đủ secret, template bị tắt hoặc kênh chưa bật, hệ thống chuyển email queue sang trạng thái `skipped` thay vì cố gửi email thất bại. Điều này giúp staging không vô tình gửi email thật.

If secrets are missing, a template is disabled or the selected channel is not enabled, queued email is marked `skipped` instead of attempting an unsafe send. This keeps staging from accidentally sending real messages.

## 3. Chuẩn bị domain và mailbox / Prepare a domain and mailbox

Bạn cần một địa chỉ người gửi thuộc domain mà bạn kiểm soát, ví dụ `no-reply@example.com` hoặc `orders@example.com`. Không nên dùng địa chỉ người nhận làm địa chỉ gửi. Với production, hãy xác minh sender domain theo hướng dẫn của nhà cung cấp để giảm khả năng email vào spam.

DNS thường cần các bản ghi SPF và DKIM do nhà cung cấp cung cấp. Một số nhà cung cấp còn yêu cầu DMARC. Không tự sao chép giá trị mẫu giữa các provider; hãy lấy chính xác hostname, record type, name và value từ dashboard của provider.

You need a sender address on a domain you control, such as `no-reply@example.com` or `orders@example.com`. Do not use a recipient address as the sender. For production, verify the sender domain with your provider to improve deliverability.

DNS commonly requires SPF and DKIM records supplied by the provider. Some providers also recommend or require DMARC. Never copy sample values between providers; use the exact hostname, record type, name and value shown by your provider dashboard.

| DNS record | Mục đích / Purpose | Lưu ý / Note |
|---|---|---|
| SPF TXT | Cho phép máy chủ/provider gửi thay domain / Authorizes sending servers/providers | Thường chỉ nên có một SPF record tổng hợp |
| DKIM TXT/CNAME | Ký email / Cryptographically signs mail | Tên record thường có selector |
| DMARC TXT | Chính sách xử lý email không vượt SPF/DKIM / Policy for failed authentication | Bắt đầu bằng policy giám sát khi domain mới |
| MX | Nhận email cho mailbox / Receives mail for the mailbox | Không tự đổi nếu website chỉ gửi |

## 4. Các biến môi trường / Environment variables

Đặt các biến sau **chỉ ở server runtime**. Tên biến phải giữ đúng như backend NEXORA đang đọc.

Set the following variables **only in the server runtime**. Keep the names exactly as read by the NEXORA backend.

| Biến / Variable | Bắt buộc khi nào / Required when | Ví dụ an toàn / Safe example |
|---|---|---|
| `SUPABASE_URL` | Luôn cần cho transactional email / Required for transactional email | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Luôn cần ở backend / Required on the backend | Không ghi giá trị thật vào docs |
| `EMAIL_FROM_ADDRESS` | Luôn cần khi gửi / Required when sending | `NEXORA <no-reply@example.com>` |
| `SMTP_HOST` | Mode `smtp` / SMTP mode | `smtp.example.com` |
| `SMTP_PORT` | Mode `smtp` / SMTP mode | `465` hoặc `587` |
| `SMTP_USERNAME` | Mode `smtp` / SMTP mode | `no-reply@example.com` |
| `SMTP_PASSWORD` | Mode `smtp` / SMTP mode | Không commit vào Git |
| `RESEND_API_KEY` | Mode `api` / API mode | Không commit vào Git |

NEXORA xác định SMTP sẵn sàng khi có `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME` và `SMTP_PASSWORD`. NEXORA xác định API sẵn sàng khi có `RESEND_API_KEY`. Ngoài ra, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và `EMAIL_FROM_ADDRESS` cũng phải tồn tại.

NEXORA considers SMTP ready when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME` and `SMTP_PASSWORD` are present. API mode is ready when `RESEND_API_KEY` is present. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `EMAIL_FROM_ADDRESS` are also required.

> **Cảnh báo / Warning:** Không đặt các biến server ở dạng `VITE_SMTP_PASSWORD`, `VITE_RESEND_API_KEY` hoặc bất kỳ biến `VITE_*` nào. Vite có thể đưa chúng vào bundle public.

## 5. Cấu hình SMTP / Configure SMTP

### 5.1 Thông số SMTP cơ bản / Basic SMTP parameters

Thông thường, port `465` dùng TLS ngay khi kết nối và backend NEXORA đặt `secure: true`. Port `587` thường bắt đầu bằng kết nối không mã hóa ở tầng TCP rồi nâng cấp qua STARTTLS; backend NEXORA đặt `secure: false` cho port này để Nodemailer xử lý STARTTLS theo cấu hình provider. Hãy ưu tiên thông số chính thức của nhà cung cấp.

Typically, port `465` uses TLS immediately and NEXORA sets `secure: true`. Port `587` commonly starts with a plain TCP connection and upgrades through STARTTLS; NEXORA sets `secure: false` for that port so Nodemailer can negotiate STARTTLS according to the provider. Prefer your provider's official settings.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-on-server-only
EMAIL_FROM_ADDRESS=NEXORA <no-reply@example.com>
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=replace-with-mailbox-password
```

Trong Admin, chọn **transactional mode = SMTP**, bật **transactional email**, nhập sender name và public site URL production, sau đó bật từng template muốn sử dụng. Secret không được hiển thị lại sau khi lưu; nếu nghi ngờ lộ password, hãy đổi password ở provider và cập nhật secret server.

In the Admin, choose **transactional mode = SMTP**, enable **transactional email**, set the sender name and production public site URL, then enable only the templates you want. Secrets must not be displayed again after saving; if a password may have leaked, rotate it at the provider and update the server secret.

### 5.2 Local development / Môi trường local

Tạo file `.env` local nếu server của dự án đọc biến môi trường từ đó, nhưng không commit file này. Có thể dùng mailbox test hoặc provider sandbox. Để tránh gửi thật, giữ `transactional_enabled` tắt trong Admin cho đến khi kiểm tra xong.

Create a local `.env` only if the project runtime loads environment files, and never commit it. Use a test mailbox or provider sandbox where possible. Keep `transactional_enabled` disabled in Admin until the configuration has been verified.

Các bước local / Local steps:

1. Cài dependency của dự án bằng `pnpm install`.
2. Đặt server-only variables trong môi trường terminal hoặc `.env` không được commit.
3. Chạy `pnpm dev`.
4. Mở Command Deck và kiểm tra trạng thái email.
5. Gửi thử tới mailbox của chính bạn sau khi bật đúng template.
6. Xóa hoặc thu hồi credential test sau khi hoàn tất.

1. Install dependencies with `pnpm install`.
2. Set server-only variables in the terminal environment or an ignored `.env` file.
3. Run `pnpm dev`.
4. Open the Command Deck and inspect email status.
5. Send a test only to your own mailbox after enabling the intended template.
6. Remove or revoke test credentials when finished.

## 6. Cấu hình Resend API / Configure Resend API

Resend là lựa chọn API HTTPS thay cho SMTP. Tạo API key trong Resend Dashboard, xác minh sender domain, sau đó đặt key ở server. Không đặt key trong frontend.

Resend is an HTTPS API option instead of SMTP. Create an API key in the Resend Dashboard, verify the sender domain, and store the key on the server. Never put the key in the frontend.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-on-server-only
EMAIL_FROM_ADDRESS=NEXORA <no-reply@example.com>
RESEND_API_KEY=re_replace-on-server-only
```

Trong Admin, chọn **transactional mode = API**, bật email và template. Nếu API mode thiếu `RESEND_API_KEY`, backend sẽ báo channel chưa sẵn sàng và không gửi thật.

In Admin, choose **transactional mode = API**, enable transactional email and the desired template. If API mode lacks `RESEND_API_KEY`, the backend reports that the channel is not ready and does not send real mail.

## 7. Kiểm tra trạng thái và gửi thử / Check status and test

Endpoint trạng thái không trả về secret, chỉ trả về cờ boolean như `smtpConfigured`, `apiConfigured`, `senderConfigured`, `databaseConfigured` và `serverReady`.

The status endpoint never returns secrets; it only reports booleans such as `smtpConfigured`, `apiConfigured`, `senderConfigured`, `databaseConfigured` and `serverReady`.

```bash
curl -s https://your-domain.example/api/transactional-emails/status
```

Kết quả mong đợi khi dùng SMTP / Expected SMTP result:

```json
{
  "apiConfigured": false,
  "smtpConfigured": true,
  "senderConfigured": true,
  "databaseConfigured": true,
  "serverReady": true
}
```

`serverReady: true` chỉ có nghĩa backend đủ điều kiện kỹ thuật. Nó không xác nhận DNS đã propagate, mailbox đã nhận thư, template đã bật hoặc email chắc chắn vào inbox. Hãy kiểm tra mailbox, spam folder, provider logs và domain authentication.

`serverReady: true` means only that the backend has the required technical configuration. It does not prove DNS propagation, mailbox delivery, template enablement or inbox placement. Check the mailbox, spam folder, provider logs and domain authentication.

## 8. Luồng email giao dịch của NEXORA / NEXORA transactional flow

Khi trạng thái đơn hoặc yêu cầu hậu mãi tạo một queue item, worker/route giao dịch lấy template tương ứng, kiểm tra quyền và secret, render token rồi gửi qua mode đã chọn. Các token mẫu gồm `{customer_name}`, `{order_number}`, `{order_total}`, `{status}`, `{review_note}`, `{orders_url}` và `{store_name}`.

When an order or service-request status creates a queue item, the transactional route loads the matching template, checks permissions and secrets, renders tokens and sends through the selected mode. Supported sample tokens include `{customer_name}`, `{order_number}`, `{order_total}`, `{status}`, `{review_note}`, `{orders_url}` and `{store_name}`.

| Sự kiện / Event | Ý nghĩa / Meaning |
|---|---|
| `paid_cancellation_status` | Cập nhật yêu cầu hủy đơn đã thanh toán / Paid-order cancellation status update |
| `return_status` | Cập nhật yêu cầu trả hàng / Return request status update |
| `order_delivered` | Thông báo đơn đã giao / Delivered-order notification |

Email chỉ được dispatch sau khi backend xác thực quyền quản lý đơn hàng. Không gọi endpoint dispatch trực tiếp từ một trang public mà không có session/Authorization hợp lệ.

Email is dispatched only after the backend verifies order-management permission. Do not call the dispatch endpoint from a public page without a valid session/Authorization header.

## 9. Admin settings và mẫu email / Admin settings and templates

Trong Command Deck, vào khu vực email giao dịch. Chọn mode, bật/tắt kênh, nhập sender name và public site URL. Sau đó mở từng template để chỉnh subject, preheader, heading, body, CTA label và footer. Dùng token đúng tên; token sai sẽ không được thay thế như mong muốn.

In the Command Deck, open transactional email settings. Select a mode, enable or disable the channel, set sender name and public site URL. Then edit each template's subject, preheader, heading, body, CTA label and footer. Use the exact token names; misspelled tokens will not render as intended.

Nên bắt đầu bằng nội dung ngắn, tiếng Việt rõ ràng và CTA dẫn tới `https://your-production-domain/orders.html`. Không đưa mật khẩu, số thẻ, service-role key hoặc dữ liệu nhạy cảm vào template. Chỉ hiển thị thông tin đơn cần thiết cho người nhận.

Start with concise content, clear Vietnamese copy and a CTA pointing to `https://your-production-domain/orders.html`. Never place passwords, card numbers, service-role keys or sensitive credentials in a template. Show only the order information necessary for the recipient.

## 10. Triển khai trên aaPanel / Deploy on aaPanel

Trên Ubuntu + aaPanel, tạo Node.js project trỏ tới thư mục đã build. Nếu dùng reverse proxy, domain phải trỏ tới aaPanel trước, SSL phải hoạt động và `public_site_url` trong Admin phải là domain HTTPS thật, không phải `localhost`.

On Ubuntu + aaPanel, create a Node.js project pointing to the built application directory. If using a reverse proxy, point the domain to aaPanel first, enable SSL, and set `public_site_url` in Admin to the real HTTPS domain instead of `localhost`.

Quy trình đề xuất / Recommended process:

1. Clone repository từ GitHub bằng SSH/deploy key hoặc upload source qua aaPanel.
2. Chạy `pnpm install --frozen-lockfile` trong thư mục project.
3. Chạy `pnpm build`.
4. Đặt biến server trong phần Environment Variables của Node project, không ghi vào frontend.
5. Dùng startup entrypoint production mà project đang cấu hình; không hardcode port, vì aaPanel/Passenger hoặc reverse proxy có thể cấp port runtime.
6. Trỏ domain và bật SSL.
7. Kiểm tra `GET /api/transactional-emails/status`.
8. Bật transactional email trong Admin và gửi thử tới mailbox kiểm thử.
9. Kiểm tra log Node, provider logs và spam folder.

1. Clone the GitHub repository using an SSH/deploy key or upload the source through aaPanel.
2. Run `pnpm install --frozen-lockfile` in the project directory.
3. Run `pnpm build`.
4. Set server variables in the Node project's Environment Variables section, never in frontend code.
5. Use the production startup entrypoint configured by the project; do not hardcode a port because aaPanel/Passenger or a reverse proxy may assign the runtime port.
6. Point the domain and enable SSL.
7. Check `GET /api/transactional-emails/status`.
8. Enable transactional email in Admin and send a test to a test mailbox.
9. Check Node logs, provider logs and the spam folder.

## 11. Triển khai trên cPanel / Deploy on cPanel

Nếu hosting cPanel hỗ trợ **Application Manager / Setup Node.js App**, tạo Node application với application root, Node version, startup file và environment variables theo thông tin hosting cung cấp. Nhiều gói shared hosting chỉ phục vụ static files và không chạy được Express route; khi đó SMTP backend của NEXORA không thể chạy chỉ bằng việc upload HTML.

If cPanel provides **Application Manager / Setup Node.js App**, create a Node application with the application root, Node version, startup file and environment variables required by the host. Many shared-hosting plans serve only static files and cannot run Express routes; in that case, uploading HTML alone cannot run NEXORA's SMTP backend.

Checklist cPanel / cPanel checklist:

| Trường / Field | Giá trị cần kiểm tra / What to verify |
|---|---|
| Application root | Thư mục chứa `package.json` và source build |
| Startup file | Entrypoint production được project/hosting yêu cầu |
| Node version | Phiên bản tương thích với `package.json` |
| Environment | Đặt toàn bộ server-only variables |
| Application URL | Domain HTTPS đã bind |
| Restart | Restart app sau khi đổi environment |
| Logs | Passenger/Node error log và access log |

Sau khi khởi động, kiểm tra route status và thử một email. Nếu cPanel chỉ hỗ trợ PHP/static, hãy giữ storefront gọi Supabase trực tiếp nhưng chạy transactional email trên một Node host riêng; không chuyển SMTP password vào JavaScript để “né” giới hạn hosting.

After startup, check the status route and send one test email. If cPanel supports only PHP/static hosting, keep the storefront calling Supabase directly but run transactional email on a separate Node host; never move the SMTP password into JavaScript to work around the hosting limitation.

## 12. Supabase Auth và reset password / Supabase Auth and password reset

Để reset password hoạt động, vào Supabase **Authentication → URL Configuration**, đặt Site URL production và thêm Redirect URLs cho local, preview và production. Frontend phải dùng URL production đúng, không để link reset trỏ về `localhost` khi gửi cho khách thật.

For password reset, open Supabase **Authentication → URL Configuration**, set the production Site URL and add Redirect URLs for local, preview and production. The frontend must use the correct production URL; do not send customer reset links pointing to `localhost`.

SMTP custom trong Supabase Auth là cấu hình riêng với transactional email NEXORA. Nếu muốn email reset password của Auth đi qua domain riêng, hãy cấu hình custom SMTP trong Supabase Dashboard theo giới hạn và hướng dẫn của Supabase; không dùng `SMTP_PASSWORD` của backend NEXORA nếu bạn chưa chủ động muốn chia sẻ cùng mailbox.

Supabase Auth custom SMTP is separate from NEXORA transactional email. If Auth password-reset messages should use your own domain, configure Supabase custom SMTP in the Supabase Dashboard according to Supabase's limits and guidance; do not reuse NEXORA's `SMTP_PASSWORD` unless you intentionally want to share the same mailbox.

## 13. Bảo mật production / Production security

| Quy tắc / Rule | Hành động / Action |
|---|---|
| Secret scope | Chỉ lưu ở server environment hoặc secret manager |
| Git history | Nếu lộ key, revoke/rotate ngay; xóa khỏi file chưa đủ vì Git history vẫn còn |
| Sender domain | Xác minh SPF, DKIM và chính sách DMARC phù hợp |
| TLS | Ưu tiên port/provider có TLS; không tắt certificate verification |
| Least privilege | API key chỉ có quyền gửi email nếu provider hỗ trợ |
| Logs | Không log SMTP password, API key, full Authorization header hoặc nội dung nhạy cảm |
| Test | Chỉ gửi test tới mailbox được phép; bật production sau khi review |
| Queue | Theo dõi `queued`, `sent`, `failed`, `skipped` và retry có kiểm soát |

Do not paste secrets into chat, screenshots, issue trackers or public GitHub. If a key has been exposed, revoke it at the provider, issue a replacement and restart the server with the new secret.

## 14. Xử lý lỗi / Troubleshooting

### `serverReady: false`

Kiểm tra lần lượt `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_FROM_ADDRESS` và các biến của mode đang chọn. Đảm bảo bạn restart Node application sau khi đổi environment.

Check `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_FROM_ADDRESS` and the variables for the selected mode. Restart the Node application after changing environment variables.

### SMTP timeout hoặc connection refused

Kiểm tra `SMTP_HOST`, port, firewall outbound, TLS mode, username và password. Port 465/587 không phải lúc nào cũng được hosting mở; hỏi nhà cung cấp hosting nếu connection bị chặn.

Check `SMTP_HOST`, port, outbound firewall, TLS mode, username and password. Hosting providers do not always allow ports 465/587; contact the host if the connection is blocked.

### `535 Authentication failed`

Mailbox password có thể sai, provider yêu cầu app password, hoặc tài khoản chưa bật SMTP submission. Tạo app password theo provider nếu được yêu cầu; không dùng mật khẩu tài khoản chính nếu provider khuyến nghị app password.

The mailbox password may be wrong, the provider may require an app password, or SMTP submission may be disabled. Create an app password when required; do not use the primary account password when the provider recommends an app password.

### Email vào spam hoặc bị từ chối

Kiểm tra sender domain, SPF, DKIM, DMARC, `EMAIL_FROM_ADDRESS`, reverse DNS nếu provider yêu cầu và provider delivery logs. Không cố giải quyết bằng cách đổi ngẫu nhiên subject hoặc gửi lặp nhiều lần.

Check sender domain, SPF, DKIM, DMARC, `EMAIL_FROM_ADDRESS`, reverse DNS if required and provider delivery logs. Do not try to fix deliverability by randomly changing subjects or repeatedly resending.

### Link email trỏ về localhost

Sửa `public_site_url` trong `email_delivery_settings` bằng domain HTTPS production. Đồng thời sửa Supabase Site URL/Redirect URLs và kiểm tra biến môi trường frontend/backend đang trỏ đúng origin.

Set `public_site_url` in `email_delivery_settings` to the production HTTPS domain. Also update Supabase Site URL/Redirect URLs and verify that frontend/backend environment values point to the correct origin.

### Template không gửi dù SMTP đã cấu hình

Kiểm tra `transactional_enabled`, `is_enabled` của template, event type, queue status và quyền dispatch. Trạng thái `skipped` thường có nghĩa hệ thống chủ động không gửi vì điều kiện an toàn chưa đủ.

Check `transactional_enabled`, the template's `is_enabled`, event type, queue status and dispatch permission. A `skipped` status usually means the system intentionally did not send because a safety condition was not met.

## 15. Checklist trước production / Pre-production checklist

- [ ] Domain sender đã xác minh / Sender domain verified.
- [ ] SPF và DKIM đã được provider xác nhận / SPF and DKIM verified by the provider.
- [ ] Site URL và Redirect URLs không còn `localhost` cho production / Production URLs no longer contain `localhost`.
- [ ] Server-only secrets không nằm trong Git / Server-only secrets are not in Git.
- [ ] `serverReady` trả về `true` trong đúng mode / `serverReady` is `true` for the selected mode.
- [ ] Template đã review nội dung, token và ngôn ngữ / Templates reviewed for content, tokens and language.
- [ ] Test mailbox nhận được email / Test mailbox received the message.
- [ ] Provider logs không báo lỗi / Provider logs show no delivery errors.
- [ ] Email queue và audit log được theo dõi / Email queue and audit logs are monitored.
- [ ] Có kế hoạch rotate secret / A secret-rotation plan exists.

## 16. Fix lỗi nguy hiểm

### Lỗi bị đẩy về localhost

Đây là lỗi khi supabase chưa update được miền thật của website, để fix phải vào Authentication -> URL Configuration và thay Site URL thành domain của bạn

This error occurs when Supabase has not yet updated the website's actual domain; to fix it, go to Authentication -> URL Configuration and change the Site URL to your domain.


## 16. Tài liệu tham khảo / References

[1]: https://nodemailer.com/ Nodemailer Documentation — SMTP transport and mail sending.
[2]: https://resend.com/docs Resend Documentation — API email sending and domain setup.
[3]: https://supabase.com/docs/guides/auth/passwords Password-based authentication and password reset in Supabase.
[4]: https://supabase.com/docs/guides/auth/auth-smtp Custom SMTP and email delivery considerations for Supabase Auth.
[5]: https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/ cPanel — How to install a Node.js application.
[6]: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site GitHub Pages — static hosting limitations and setup.

**Tác giả / Author:** Minhduc290613
**Dự án / Project:** NEXORA Tech Store  
**Cập nhật / Updated:** 2026-08-29
