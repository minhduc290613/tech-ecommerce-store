# Cấu hình Environment trên Render / Render Environment Configuration

## Tóm tắt

NEXORA chạy trên Render dưới dạng **Web Service Node.js**, không phải Static Site, vì cần Express xử lý tRPC, Supabase server calls, PayOS webhook và các endpoint thanh toán. Repository đã có `render.yaml` với build command, start command, health check và danh sách biến môi trường.

> NEXORA requires a **Node.js Web Service** on Render rather than a Static Site because Express handles tRPC, server-side Supabase calls, PayOS webhooks, and payment endpoints. The repository now includes `render.yaml` with the production commands, health check, and environment variable inventory.

## 1. Tạo service từ Blueprint

Trong Render chọn **New → Blueprint**, kết nối repository GitHub rồi chọn branch `main`. Render sẽ đọc file:

```text
render.yaml
```

Nếu tạo thủ công, dùng các giá trị sau:

| Render setting | Giá trị |
| --- | --- |
| Runtime | Node |
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Start Command | `pnpm start` |
| Health Check Path | `/healthz` |
| Region | Singapore hoặc region gần khách hàng |

Không dùng Static Site cho bản đầy đủ có server. Static Site chỉ phù hợp với bản demo không có webhook hoặc backend.

## 2. Biến bắt buộc

Đặt các biến sau trong **Render → Service → Environment → Environment Variables**:

| Biến | Bắt buộc | Mục đích |
| --- | --- | --- |
| `NODE_ENV` | Có | Đặt `production`. |
| `JWT_SECRET` | Có | Secret ký session/OAuth. Có thể để Render tự generate từ `render.yaml`. |
| `VITE_SUPABASE_URL` | Có | Supabase URL được bundle vào frontend. |
| `VITE_SUPABASE_ANON_KEY` | Có | Publishable/anon key cho frontend. Đây không phải Service Role Key. |
| `SUPABASE_URL` | Có khi dùng server/payment | Supabase URL cho backend. |
| `SUPABASE_SERVICE_ROLE_KEY` | Có khi bật PayOS/webhook server | Backend-only key để đối soát và cập nhật đơn. Không đưa vào frontend. |
| `PUBLIC_SITE_URL` | Có khi bật PayOS | URL public hiện tại, ví dụ `https://your-service.onrender.com`. Không có dấu `/` cuối. |

`VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` được đọc lúc build. Sau khi thay đổi hai biến này, phải **Manual Deploy → Deploy latest commit** để Vite bundle lại frontend.

## 3. PayOS và thanh toán tự động

Chỉ thêm các biến PayOS khi đã có secret production:

```env
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
```

Khi đủ ba biến PayOS cùng `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và `PUBLIC_SITE_URL`, endpoint tạo checkout và webhook mới sẵn sàng. Nếu chưa nhập, storefront vẫn có thể chạy các phương thức không phụ thuộc PayOS; không nên điền giá trị giả.

Các biến webhook ngân hàng là tùy chọn và chỉ cần cho nhà cung cấp tương ứng:

```env
SEPAY_WEBHOOK_SECRET=...
CASSO_WEBHOOK_SECURE_TOKEN=...
VIETQR_PARTNER_USERNAME=...
VIETQR_PARTNER_PASSWORD=...
```

## 4. Biến tích hợp tùy chọn

Các biến sau chỉ cần nếu bạn vẫn dùng chức năng tương ứng:

```env
VITE_APP_ID=...
VITE_OAUTH_PORTAL_URL=...
OAUTH_SERVER_URL=...
OWNER_OPEN_ID=...
DATABASE_URL=...
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
VITE_FRONTEND_FORGE_API_URL=...
VITE_FRONTEND_FORGE_API_KEY=...
PUBLIC_APP_URL=https://your-service.onrender.com
```

`DATABASE_URL` không thay thế Supabase. NEXORA vẫn dùng Supabase cho Auth, Storage, RLS và dữ liệu storefront. Các biến `BUILT_IN_FORGE_*` chỉ cần nếu sử dụng lại Manus Forge hoặc Manus Storage proxy cũ.

## 5. Những biến không được đặt sai

Không đặt `SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, SMTP password hoặc webhook secret trong bất kỳ biến nào bắt đầu bằng `VITE_`. Vite sẽ đưa mọi biến `VITE_*` vào JavaScript trình duyệt.

Frontend chỉ được dùng:

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Backend mới được dùng:

```env
SUPABASE_SERVICE_ROLE_KEY=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
```

## 6. Kiểm tra sau khi deploy

Mở endpoint sau trên domain Render:

```text
https://your-service.onrender.com/healthz
```

Kết quả đúng có dạng:

```json
{"ok":true,"service":"nexora","environment":"production"}
```

Sau đó kiểm tra:

1. Trang storefront tải bình thường.
2. Đăng nhập Supabase hoạt động.
3. Admin truy cập được khi tài khoản có capability.
4. Upload ảnh mới tạo URL `/storage/v1/object/public/nexora-brand-assets/...`.
5. `/api/payments/payos/status` chỉ báo sẵn sàng khi đủ secret server.
6. PayOS webhook được cấu hình trỏ tới endpoint public tương ứng.

## 7. Lỗi thường gặp

**`pnpm: command not found`**: dùng đúng Build Command có `corepack enable`, hoặc cài Node version tương thích trong Render.

**Service không healthy**: kiểm tra Start Command là `pnpm start`, port không được hard-code ngoài `PORT`, và health path là `/healthz`.

**Supabase chưa cấu hình**: kiểm tra cả hai cặp biến frontend/backend. Frontend dùng `VITE_SUPABASE_*`; payment server dùng `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.

**PayOS trả về 503**: kiểm tra đủ `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và `PUBLIC_SITE_URL`.

**Đổi env nhưng website chưa đổi**: các biến `VITE_*` chỉ có hiệu lực sau build mới. Hãy deploy lại, không chỉ restart service.

## English checklist

1. Deploy as a Render **Web Service**.
2. Use `corepack enable && pnpm install --frozen-lockfile && pnpm build` as the build command.
3. Use `pnpm start` as the start command.
4. Set health check path to `/healthz`.
5. Set `NODE_ENV=production` and keep `JWT_SECRET` server-only.
6. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the browser build.
7. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only for backend/payment features.
8. Add PayOS secrets only when PayOS production is ready.
9. Redeploy after every change to a `VITE_*` variable.

## References

[1]: https://render.com/docs/web-services "Render Web Services"
[2]: https://render.com/docs/configure-environment-variables "Render Environment Variables and Secrets"
[3]: https://render.com/docs/blueprint-spec "Render Blueprint YAML Reference"
