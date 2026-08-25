# Role, kiểm duyệt, affiliate và hoàn tiền

NEXORA mở rộng Command Deck bằng một **ma trận quyền kiểm soát tại database**. Giao diện chỉ là lớp hỗ trợ thao tác; Supabase RLS và RPC là lớp quyết định cuối cùng. Mỗi thay đổi role, duyệt affiliate, kiểm duyệt nội dung hoặc xử lý hoàn tiền được ghi vào audit log.

> Không cấp quyền bằng cách tự sửa JavaScript trình duyệt. Hãy dùng workspace **Role & kiểm duyệt** hoặc RPC tương ứng để quy tắc và audit log được giữ nguyên.

## Ma trận role

| Role | Command Deck | Quyền chính | Giới hạn quan trọng |
| --- | --- | --- | --- |
| `customer` | Không | Mua hàng, quản lý hồ sơ/số dư, gửi bình luận, yêu cầu hoàn tiền. | Không tạo bài viết, không quản trị. |
| `affiliate` | Không | Tạo bài viết trong Account Center, lấy link referral sau khi được duyệt. | Không tự duyệt bài, không xem dữ liệu khách/đơn. |
| `marketing` | Có | Soạn bài viết và gửi duyệt. | Không quản lý role, đơn, số dư hay CMS. |
| `order_manager` | Có | Xử lý đơn hàng, duyệt/từ chối/hoàn tiền. | Không xuất sổ cái CSV, không đổi branding/site settings. |
| `moderator` | Có | Gán role không phải `admin`, duyệt affiliate, review, bình luận và bài viết. | Không đổi role `admin`, không điều chỉnh số dư hoặc CMS. |
| `admin` | Có, cao nhất | Toàn bộ quyền trên, cộng/trừ số dư, CMS, payment config, favicon, hiệu ứng và CSV. | Vẫn phải dùng quy trình audit, đối soát và legal review. |

Admin là cấp cao nhất. Moderator có thể quản lý các role vận hành nhưng không thể cấp, hạ hoặc thay đổi `admin`.

## Role & kiểm duyệt

Trong **Command Deck → Role & kiểm duyệt**, admin và moderator thấy hồ sơ cơ bản cùng role hiện có. Khi chọn role mới, hệ thống yêu cầu ghi chú và gọi `assign_user_role`; thao tác này cập nhật `user_roles`, đồng bộ `admin_users` khi role là `admin`, sau đó thêm một dòng `role_assigned` vào `account_audit_log`.

Review, bình luận và bài viết đều đi qua hàng đợi moderation. Review sản phẩm chỉ được gửi nếu khách đã nhận sản phẩm hoặc đơn đã hoàn thành; còn bình luận yêu cầu người dùng đăng nhập. Nội dung công khai chỉ hiển thị khi có trạng thái `approved` hoặc, với bài viết, `published`.

Trang đọc bài viết công khai là `/article.html?slug=<slug>`. Trang chỉ query bài `published`, escape nội dung trước khi render và trả empty state khi slug không hợp lệ, không tồn tại hoặc chưa xuất bản.

| Loại nội dung | Người gửi | Trạng thái đầu | Người duyệt | Trạng thái công khai |
| --- | --- | --- | --- | --- |
| Đánh giá sản phẩm | Khách đã nhận hàng | `pending` | Moderator hoặc admin | `approved` |
| Bình luận sản phẩm | Khách đã đăng nhập | `pending` | Moderator hoặc admin | `approved` |
| Bài viết | Marketing, moderator, admin hoặc affiliate đã duyệt | `draft`/`pending` | Moderator hoặc admin | `published` |

## Affiliate và hoa hồng 15%

Affiliate bắt đầu bằng yêu cầu trong **Tài khoản & số dư → Affiliate**. Điều kiện mặc định là đã có ít nhất một đơn `delivered`; chương trình có thể yêu cầu moderator/admin duyệt. Sau khi được duyệt, người dùng nhận role `affiliate` và một link ở dạng:

```text
https://<domain-cua-ban>/?ref=<REFERRAL_CODE>
```

Referral được liên kết một lần với người mua sau khi họ đăng nhập; người dùng không thể tự dùng link của chính mình. Khi đơn referral có trạng thái thanh toán hợp lệ và fulfillment là `delivered`, hệ thống tạo **hoa hồng 15% mặc định** bằng `floor(total_amount × commission_rate / 100)`, ghi chứng từ `affiliate_commission` vào sổ cái và cộng số dư affiliate. Tỷ lệ, điều kiện đơn và yêu cầu duyệt nằm trong `affiliate_program_settings`.

> Khi hoàn tiền, hoa hồng của đơn chuyển sang `pending_reversal` để tránh coi đó là khoản đã chốt. Việc đảo khoản hoa hồng là nghiệp vụ đối soát tiếp theo; cần có quy trình kế toán rõ ràng trước khi chi trả tiền thật.

## Hoàn tiền và CSV

Khách tạo yêu cầu hoàn tiền cho đơn có trạng thái `paid`, `processing` hoặc `completed`. Order manager/admin có thể phê duyệt, từ chối hoặc hoàn tiền. Nếu chọn phương thức `wallet`, hệ thống cộng khoản hoàn vào số dư khách và ghi chứng từ `refund`; nếu chọn `manual`, quản trị viên phải đối soát giao dịch ngoài hệ thống.

| Thao tác | Role được phép | Dấu vết |
| --- | --- | --- |
| Tạo yêu cầu hoàn tiền | Chủ đơn | `refund_requests`, trạng thái đơn `requested` |
| Duyệt/từ chối/hoàn tiền | `order_manager`, `admin` | `refund_reviewed`, trạng thái đơn và request |
| Hoàn về số dư | `order_manager`, `admin` | Sổ cái `refund` và balance mới |
| Xuất CSV sổ cái/yêu cầu nạp | `admin` | Download tại Command Deck; lưu file theo chính sách dữ liệu nội bộ |

Không xuất CSV lên GitHub, không gửi bằng kênh công khai và không dùng file CSV như bản ghi gốc. Database cùng audit log vẫn là nguồn đối soát chính.

## Sản phẩm nổi bật theo gian hàng

Mỗi `products.shop_id` liên kết trực tiếp tới `shops.id`. Trong **Command Deck → Sản phẩm**, admin chọn gian hàng khi tạo/sửa catalog; bảng catalog hiển thị tên shop hoặc nhãn **Chưa gán gian hàng** để tránh nhầm lẫn. Storefront ưu tiên mapping này khi dựng sản phẩm nổi bật theo shop; chỉ dùng fallback theo danh mục khi shop không có sản phẩm được gán.

## CMS nâng cao dành cho admin

Workspace **Cấu hình nâng cao** chỉ dành cho admin. Tại đây có thể cập nhật mã ngân hàng/số tài khoản/tên người nhận, số MoMo, URL favicon, hiệu ứng storefront và chương trình affiliate.

Admin có thể bật/tắt affiliate, đặt **tỷ lệ hoa hồng từ 0–100%**, số đơn `delivered` tối thiểu, tổng giá trị `delivered` tối thiểu và yêu cầu duyệt. Lưu cấu hình gọi RPC `admin_update_affiliate_program`, được kiểm tra quyền admin tại database và ghi `affiliate_program_updated` vào audit log. Tỷ lệ được dùng khi trigger tạo commission cho đơn đủ điều kiện về sau; không hồi tố chứng từ đã tồn tại.

| Thiết lập hiệu ứng | Ý nghĩa | Khuyến nghị |
| --- | --- | --- |
| `none` | Tắt hiệu ứng. | Dùng làm mặc định. |
| `snow` | Hạt tuyết rơi có thể đổi màu/mật độ. | Mật độ thấp trên mobile, kiểm tra `prefers-reduced-motion` khi mở rộng. |
| `cherry_blossom` | Cánh hoa anh đào rơi, có màu/mật độ tùy chỉnh. | Chỉ bật cho mùa/campaign phù hợp. |

Thông tin tài khoản nhận tiền là dữ liệu vận hành nhạy cảm. Chỉ nhập sau khi đối soát với chủ shop, không đưa vào file public hoặc lịch sử commit GitHub.

## Kiểm thử trước khi mở quyền

| Kiểm thử | Kết quả cần có |
| --- | --- |
| Customer mở `/admin.html` | Bị chặn. |
| Marketing vào Command Deck | Chỉ thấy khu vực phù hợp để tạo/duyệt bài theo quyền. |
| Moderator đổi role `admin` | Bị database từ chối. |
| Review/bình luận gửi mới | Không hiển thị công khai trước khi duyệt. |
| Đơn referral delivered | Sinh một chứng từ hoa hồng, không trùng lặp theo `order_id`. |
| Hoàn tiền wallet | Balance và `wallet_ledger` cùng thay đổi trong luồng duyệt. |
| Xuất CSV | Chỉ admin thấy/tải được nút export. |

Xem thêm [Account & Wallet](ACCOUNT_WALLET.md), [hướng dẫn Supabase](SUPABASE.md), [ghi nhận kiểm tra](VERIFICATION_NOTES.md) và [phạm vi mở rộng](FEATURE_EXPANSION_SCOPE.md).
