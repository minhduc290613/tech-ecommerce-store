# Ghi chú kỹ thuật — CK tự động đa nhà cung cấp

Tài liệu này ghi nhận yêu cầu tích hợp và các ràng buộc từ tài liệu nhà cung cấp. Không chứa API key, webhook secret, tài khoản ngân hàng hay dữ liệu giao dịch thực.

| Nhà cung cấp | Mô hình | Yêu cầu xác thực / đối soát |
| --- | --- | --- |
| SePay | Webhook HTTP POST khi phát sinh giao dịch. | Ưu tiên HMAC-SHA256 trên raw body, kiểm tra timestamp chống replay và dùng `id` giao dịch làm khóa idempotency. [1] [2] |
| Casso | Webhook HTTP POST mang danh sách giao dịch. | Kiểm tra `secure-token` header, chỉ nhận giao dịch tiền vào và dùng ID giao dịch Casso làm khóa idempotency. [3] |
| VietQR Host2Host | QR động theo đơn và callback đồng bộ giao dịch. | VietQR yêu cầu API token Basic Auth/Bearer Token, API Transaction Sync và thông tin kết nối được cấp sau quá trình UAT/golive. [4] |

Thiết kế NEXORA phải chỉ xác nhận đơn khi nhà cung cấp được bật, callback đã xác thực, giao dịch là tiền vào, mã đơn/số tiền khớp và mã giao dịch chưa từng được xử lý. Webhook secret chỉ đặt trong biến môi trường server; Command Deck chỉ quản lý lựa chọn nhà cung cấp, trạng thái bật/tắt và URL endpoint.

## Nguồn

[1]: https://developer.sepay.vn/en/sepay-webhooks/xac-thuc "SePay Webhook authentication"
[2]: https://developer.sepay.vn/en/sepay-webhooks/tich-hop-webhook "SePay webhook integration and deduplication"
[3]: https://developer.casso.vn/v1/thuc-hanh/tich-hop-xac-nhan-thanh-toan "Casso payment confirmation webhook"
[4]: https://doc.vietqr.vn/doc/api-vietqr-callback/api-vietqr-host2host/integrated-document-for-payment-service-vietqr "VietQR Host2Host integration"
