# PayOS.vn — Cấu hình và vận hành / Setup and Operations

## Tiếng Việt

NEXORA tích hợp PayOS ở **server-side**. Trình duyệt chỉ nhận `checkoutUrl`; các credential PayOS không được lưu trong `site_settings`, không được đưa vào `app.js` và không được hiển thị lại trong Admin. Mantis Admin chỉ cho phép bật/tắt trạng thái hiển thị và ghi nhận rằng PayOS cần được cấu hình ở môi trường server.

### Biến môi trường bắt buộc

| Biến | Mục đích |
|---|---|
| `PAYOS_CLIENT_ID` | Client ID của ứng dụng PayOS |
| `PAYOS_API_KEY` | API key dùng để tạo payment link |
| `PAYOS_CHECKSUM_KEY` | Checksum key dùng để xác thực chữ ký webhook |
| `SUPABASE_URL` | URL project Supabase phía server |
| `SUPABASE_SERVICE_ROLE_KEY` | Key server để cập nhật đơn sau webhook; tuyệt đối không đưa vào frontend |
| `PUBLIC_SITE_URL` | URL public, ví dụ `https://nexorashop-gpjdasbm.manus.space`, dùng cho `returnUrl` và `cancelUrl` |

Đặt các biến trên trong Secrets của môi trường chạy Express/Autoscale hoặc trong secret manager của hosting. Không commit `.env`, không chụp màn hình giá trị secret và không nhập các secret này vào ô cấu hình public của Admin.

### Luồng thanh toán

Khách tạo đơn ở trạng thái `pending_payment`, chọn **PayOS**, sau đó storefront gửi `orderId` kèm Supabase access token tới `POST /api/payments/payos/create`. Server xác minh user sở hữu đơn, kiểm tra đơn còn chờ thanh toán, tạo payment link bằng SDK `@payos/node`, lưu `payment_method = payos` và chuyển trình duyệt tới `checkoutUrl`.

PayOS gọi `POST /api/payments/payos/webhook`. Server xác thực payload bằng Checksum key, trích mã đơn từ phần mô tả, đối chiếu số tiền với `orders.total_amount`, rồi mới cập nhật đơn thành `paid`. Webhook được xử lý idempotent: đơn đã `paid`, `processing` hoặc `completed` sẽ không bị cộng doanh thu lần hai. Không đánh dấu thanh toán chỉ dựa vào redirect của trình duyệt.

### Cấu hình webhook trong PayOS

Trong trang quản trị PayOS, đặt webhook URL là `https://YOUR_DOMAIN/api/payments/payos/webhook`. `YOUR_DOMAIN` phải là domain HTTPS public đang chạy NEXORA; không dùng `localhost` trong production. `returnUrl` và `cancelUrl` được server tạo từ `PUBLIC_SITE_URL`.

Sau khi nhập secret, kiểm tra lần lượt `GET /api/payments/payos/status`, đăng nhập storefront, tạo một đơn giá trị nhỏ trong sandbox, chọn PayOS và kiểm tra ba điểm: PayOS tạo được checkout URL, webhook trả về HTTP 200, và Command Deck chỉ tăng doanh thu sau khi `orders.status` chuyển thành `paid`.

### Xử lý sự cố

Nếu storefront báo “PayOS chưa được cấu hình”, một trong ba secret PayOS hoặc secret Supabase server đang thiếu. Nếu tạo link thành công nhưng webhook không cập nhật đơn, kiểm tra URL HTTPS, firewall, chữ ký Checksum key và log server; không tự sửa trạng thái `paid` bằng SQL nếu chưa đối chiếu giao dịch trên PayOS. Nếu số tiền không khớp, webhook bị từ chối để bảo vệ đơn hàng.

## English

NEXORA integrates PayOS **server-side**. The browser receives only a `checkoutUrl`; PayOS credentials are never stored in `site_settings`, bundled into `app.js`, or rendered back by Admin. The Mantis Admin integration panel manages public enablement metadata only; actual credentials belong in the server environment.

### Required environment variables

| Variable | Purpose |
|---|---|
| `PAYOS_CLIENT_ID` | PayOS application client ID |
| `PAYOS_API_KEY` | API key used to create payment links |
| `PAYOS_CHECKSUM_KEY` | Checksum key used to verify webhook signatures |
| `SUPABASE_URL` | Server-side Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server key used to update orders after a verified webhook; never expose it to the browser |
| `PUBLIC_SITE_URL` | Public HTTPS URL used for `returnUrl` and `cancelUrl` |

Store these values in the Express/Autoscale secrets manager or the hosting provider’s secret store. Never commit `.env`, include secrets in screenshots, or paste them into public Admin settings.

### Payment flow

A customer creates a `pending_payment` order and selects **PayOS**. The storefront sends the `orderId` with the Supabase access token to `POST /api/payments/payos/create`. The server verifies ownership, confirms that the order is still pending, creates a payment link through `@payos/node`, records `payment_method = payos`, and redirects the browser to the returned `checkoutUrl`.

PayOS calls `POST /api/payments/payos/webhook`. The server verifies the payload with the Checksum key, extracts the order number from the description, compares the amount with `orders.total_amount`, and only then marks the order as `paid`. Processing is idempotent: already paid, processing, or completed orders do not increase revenue twice. A browser redirect is never treated as proof of payment.

### Webhook setup

In the PayOS dashboard, set the webhook URL to `https://YOUR_DOMAIN/api/payments/payos/webhook`. Use the real public HTTPS domain in production, not `localhost`. The server derives return and cancel URLs from `PUBLIC_SITE_URL`.

After secrets are entered, check `GET /api/payments/payos/status`, sign in to the storefront, create a small sandbox order, select PayOS, and verify: a checkout URL is created, the webhook returns HTTP 200, and Command Deck revenue increases only after `orders.status` becomes `paid`.

### Troubleshooting

If the storefront says PayOS is not configured, one of the PayOS credentials or the server-side Supabase credentials is missing. If checkout creation succeeds but the order does not update, check the HTTPS webhook URL, firewall, Checksum key, and server logs. Do not manually set `paid` with SQL without reconciling the transaction in PayOS. Amount mismatches are rejected deliberately to protect the order.
