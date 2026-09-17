# Hệ thống “Ghi sau” / Deferred Work Backlog

## Tiếng Việt

Hệ thống **Ghi sau** biến các yêu cầu chưa muốn triển khai ngay thành backlog có thể truy vết. Khi người dùng nói “ghi sau”, “làm sau”, “để sau” hoặc cách diễn đạt tương đương, yêu cầu được lưu dưới dạng một mục trong bảng `deferred_work_items` thay vì bị bỏ qua hoặc tự động thực hiện.

Trong Command Deck, mở **Ghi sau / Backlog** để tìm kiếm, lọc theo trạng thái hoặc ưu tiên, tạo mục mới, chỉnh sửa nội dung, đặt hạn xử lý và lưu trữ. Các trạng thái gồm `backlog`, `in_progress`, `blocked`, `completed` và `archived`. Một mục chỉ được đánh dấu `completed` khi có `completed_at` và `completed_by`; việc lưu trữ không xóa lịch sử.

Quyền truy cập được kiểm soát bởi capability `deferredWork`. Trong cấu hình NEXORA hiện tại, `admin`, `moderator` và `marketing` được cấp capability này; RLS Supabase ngăn các tài khoản không có quyền đọc hoặc thay đổi backlog. Không lưu mật khẩu, token, API key, checksum key hoặc secret thanh toán vào `source_message`.

Khi người dùng yêu cầu làm tiếp một mục, chuyển trạng thái sang `in_progress`, thực hiện theo plan, chạy test và chỉ chuyển sang `completed` sau khi kiểm thử đạt. Nếu thiếu secret, migration hoặc quyền, dùng `blocked` và ghi rõ nguyên nhân thay vì đánh dấu hoàn thành.

## English

The **Deferred Work** system turns requests that should not be implemented immediately into a traceable backlog. When a user says “do this later”, “save this for later”, “defer this”, or uses equivalent wording, the request is stored in `deferred_work_items` rather than silently dropped or implemented automatically.

In Command Deck, open **Ghi sau / Backlog** to search, filter by status or priority, create items, edit details, set due dates, and archive work. Supported statuses are `backlog`, `in_progress`, `blocked`, `completed`, and `archived`. An item can only be marked `completed` when `completed_at` and `completed_by` are present; archiving preserves the audit history.

Access is controlled by the `deferredWork` capability. In the current NEXORA configuration, `admin`, `moderator`, and `marketing` receive this capability; Supabase RLS prevents unauthorized accounts from reading or changing the backlog. Never place passwords, tokens, API keys, checksum keys, or payment secrets in `source_message`.

When the user asks to continue a deferred item, move it to `in_progress`, follow the normal implementation plan, run tests, and mark it `completed` only after verification succeeds. If a secret, migration, or permission is missing, use `blocked` and record the reason instead of claiming completion.

## Cấu trúc dữ liệu / Data model

| Trường / Field | Giá trị / Values |
| --- | --- |
| `category` | `general`, `feature`, `bug`, `content`, `operations`, `payment`, `documentation` |
| `priority` | `urgent`, `high`, `normal`, `low` |
| `status` | `backlog`, `in_progress`, `blocked`, `completed`, `archived` |
| `source` | Nguồn yêu cầu, thường là `chat` / Request source, usually `chat` |
| `source_message` | Nội dung gốc đã loại bỏ dữ liệu nhạy cảm / Sanitized source request |

> “Ghi sau” trì hoãn triển khai, không trì hoãn việc ghi nhận. / Deferring implementation does not mean dropping the request.
