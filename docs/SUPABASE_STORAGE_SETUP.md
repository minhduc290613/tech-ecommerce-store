# Cấu hình Supabase Storage cho ảnh upload từ Admin

## Kết luận nhanh

NEXORA đã có sẵn luồng upload ảnh phía Admin bằng Supabase Storage. Luồng hiện tại dùng bucket `nexora-brand-assets`, kiểm tra loại file và kích thước ở frontend, upload bằng Supabase Anon/Publishable Key, rồi lưu public URL vào CMS hoặc sản phẩm.

Bạn chỉ cần tạo đúng bucket, áp dụng schema canonical và cấp role/capability phù hợp. **Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào `client/supabase-config.js`, trình duyệt hoặc GitHub.** Supabase Storage mặc định yêu cầu RLS policy cho thao tác upload; bucket public chỉ cho phép tải ảnh công khai, không tự động cấp quyền upload [1] [2].

## 1. Kiểm tra thông tin Supabase

Trong Supabase Dashboard, mở đúng project NEXORA. Vào **Project Settings → API** và lấy:

- **Project URL**, dùng cho `SUPABASE_URL`.
- **Publishable/Anon Key**, dùng ở frontend.
- **Service Role Key**, chỉ dùng ở backend hoặc môi trường quản trị tin cậy nếu cần.

Kiểm tra file:

```text
client/supabase-config.js
```

File này cần chứa URL project và publishable/anon key hợp lệ. Publishable/anon key có thể xuất hiện trong frontend. Service Role Key thì không được xuất hiện ở đó.

## 2. Tạo bucket

Cách đơn giản nhất là mở **Supabase Dashboard → SQL Editor** và áp dụng file canonical duy nhất:

```text
supabase-unified.sql
```

File này đã có phần tạo bucket tương đương:

```sql
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'nexora-brand-assets',
  'nexora-brand-assets',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

Nếu đã chạy `supabase-unified.sql`, không cần chạy riêng đoạn trên. Chỉ cần mở **Storage → Buckets** và kiểm tra bucket `nexora-brand-assets` có trạng thái **Public**.

| Thuộc tính | Giá trị hiện tại |
| --- | --- |
| Bucket | `nexora-brand-assets` |
| Public | Bật |
| Dung lượng tối đa | 5 MB mỗi file |
| Định dạng | JPG, PNG, WEBP, SVG |
| Thư mục | `branding/`, `articles/`, `products/`, `carriers/` |

## 3. Policy upload theo quyền

Schema canonical đã tạo policy theo capability. Ví dụ, logo, favicon, banner và OG image dùng policy:

```sql
create policy "NEXORA branding asset upload"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'nexora-brand-assets'
  and (storage.foldername(name))[1] = 'branding'
  and public.has_role_capability('siteSettings')
);
```

Các thư mục hiện tại được phân quyền như sau:

| Thư mục | Capability/quyền |
| --- | --- |
| `branding/` | `siteSettings` |
| `articles/` | Quyền viết bài |
| `products/` | Admin |
| `carriers/` | Quyền quản lý logistics |

Tài khoản phải đăng nhập Supabase. Admin cần có capability `siteSettings` để upload logo, favicon, banner và OG image. Không tạo policy upload cho `anon` hoặc policy có `with check (true)`.

## 4. Luồng upload đã có trong NEXORA

Mã hiện tại nằm trong:

```text
client/admin.js
client/account-center.js
```

Ví dụ luồng branding:

```js
const path = `branding/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

const { error } = await db.storage
  .from("nexora-brand-assets")
  .upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

const { data } = db.storage
  .from("nexora-brand-assets")
  .getPublicUrl(path);
```

URL sau khi upload có dạng:

```text
https://PROJECT_REF.supabase.co/storage/v1/object/public/nexora-brand-assets/branding/FILE_NAME.webp
```

Sau khi upload, Admin vẫn phải bấm **Lưu form**. Upload file và lưu URL vào CMS là hai bước riêng biệt.

## 5. Kiểm thử

Đăng nhập bằng tài khoản có quyền phù hợp rồi thực hiện các bước sau:

1. Mở Command Deck và upload một logo PNG nhỏ.
2. Kiểm tra file xuất hiện trong `Storage → nexora-brand-assets → branding`.
3. Mở public URL ở tab ẩn danh. Ảnh phải tải được mà không cần đăng nhập.
4. Lưu form thương hiệu và tải lại storefront.
5. Thử file lớn hơn 5 MB hoặc định dạng không được hỗ trợ. Admin phải từ chối file.
6. Thử upload ảnh bài viết, ảnh sản phẩm hoặc logo tùy theo quyền tài khoản.
7. Kiểm tra URL mới không còn bắt đầu bằng `/manus-storage/`.

## 6. Cấu hình Render

Trong Render, thêm các biến cơ bản:

```env
NODE_ENV=production
PUBLIC_SITE_URL=https://TEN-SERVICE.onrender.com
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Chỉ thêm `SUPABASE_SERVICE_ROLE_KEY` nếu backend thực sự có endpoint cần quyền quản trị. Không đưa biến này vào mã frontend.

Sau khi có domain production, cập nhật trong Supabase:

- **Authentication → URL Configuration → Site URL**.
- **Redirect URLs** cho domain Render hoặc domain riêng.
- Các webhook thanh toán nếu vẫn trỏ về domain cũ.

## 7. Xử lý lỗi

### `Bucket not found`

Kiểm tra code và Dashboard đều dùng chính xác:

```text
nexora-brand-assets
```

Nếu bucket chưa tồn tại, áp dụng phần Storage trong `supabase-unified.sql`.

### `new row violates row-level security policy`

Tài khoản chưa có capability cần thiết hoặc policy chưa được áp dụng. Kiểm tra role, capability và session đăng nhập. Không mở upload cho `anon` để chữa lỗi này.

### `The resource already exists`

NEXORA dùng timestamp và UUID trong tên file nên thông thường không bị trùng. Không nên bật `upsert` tùy tiện vì có thể ghi đè ảnh đang được CMS sử dụng.

### `403` khi mở public URL

Kiểm tra bucket có phải Public không. Nếu chuyển bucket sang Private, phải dùng signed URL thay vì `getPublicUrl`. Ảnh logo, banner và catalog công khai phù hợp với bucket Public; tài liệu riêng tư nên dùng bucket Private [4].

### Ảnh cũ vẫn lỗi trên Render

Ảnh tĩnh mặc định đã nằm trong `client/public/media`. Ảnh upload mới phải dùng URL Supabase Storage. Nếu CMS còn lưu URL `/manus-storage/...`, hãy upload lại ảnh hoặc sửa URL trong CMS.

## 8. Bảo mật vận hành

Không commit `.env` vào GitHub. Không dùng Service Role Key trong browser. Giới hạn MIME type, kích thước và thư mục bằng cả validation frontend lẫn Storage policy. Trước khi xóa file cũ, kiểm tra URL đó không còn được sản phẩm, bài viết hoặc CMS sử dụng.

## References

[1]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage Access Control"
[2]: https://supabase.com/docs/guides/storage/buckets/fundamentals "Supabase Storage Buckets Fundamentals"
[3]: https://supabase.com/docs/guides/storage/uploads/standard-uploads "Supabase Storage Standard Uploads"
[4]: https://supabase.com/docs/guides/storage/serving/downloads "Supabase Serving Assets from Storage"

## English summary

NEXORA already uploads Admin images to the `nexora-brand-assets` Supabase Storage bucket. Apply `supabase-unified.sql`, keep the bucket public for storefront images, and preserve the role-based `storage.objects` insert policies. Use the Supabase publishable/anon key in the browser, never the Service Role Key. New CMS URLs should use `/storage/v1/object/public/nexora-brand-assets/...` instead of `/manus-storage/...`.

The existing upload code is in `client/admin.js` and `client/account-center.js`; no frontend code change is required when the bucket and policies are configured correctly.
