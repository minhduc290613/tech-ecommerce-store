# Checklist sửa lỗi — NEXORA Tech Store

- [x] Kiểm tra lỗi runtime và console của storefront.
- [x] Kiểm tra các điểm lỗi tiềm ẩn trong app.js, đặc biệt là Supabase và QR thanh toán.
- [x] Sửa lỗi đã xác nhận và bảo đảm cấu hình chưa điền không gây trải nghiệm sai lệch.
- [x] Build lại, kiểm tra giao diện và lưu phiên bản sửa lỗi.

## Khôi phục production

- [x] Kiểm tra HTTP, console và asset của trang chủ production.
- [x] Xác định thay đổi gây lỗi và áp dụng cách khôi phục an toàn.
- [x] Xác minh trang chủ trên production sau khi khắc phục.

## Trang quản trị

- [x] Thiết kế quyền admin và chính sách RLS phù hợp với Supabase.
- [x] Mở rộng SQL schema bằng bảng admin, chính sách quyền và script cấp admin.
- [x] Xây dựng trang quản trị sản phẩm và đơn hàng có kiểm soát truy cập.
- [x] Kiểm thử giao diện quản trị và soạn hướng dẫn tạo admin an toàn.

## Tài liệu dự án

- [x] Tổng hợp cấu trúc source, các SQL script và các cấu hình cần thiết.
- [x] Viết README hướng dẫn cài đặt, cấu hình, vận hành và khắc phục lỗi cơ bản.
- [x] Lưu README vào phiên bản production.

## Tương thích static hosting

- [x] Kiểm tra entrypoint index.html hiện có và output build.
- [x] Thêm index.html ở root repository để host tĩnh tự nhận diện storefront.
- [x] Xác nhận build vẫn tạo đúng storefront và trang quản trị.

## Mở rộng nội dung sàn và CMS

- [x] Xác định các trang nội dung, quy trình bán hàng và mô hình CMS phù hợp.
- [x] Thêm schema Supabase cho cài đặt site, FAQ, nội dung pháp lý và gian hàng.
- [x] Xây dựng trang nội dung, FAQ, bảo mật, điều khoản và danh mục gian hàng.
- [x] Mở rộng Command Deck để quản trị nhận diện, banner, FAQ và nội dung sàn.
- [x] Kiểm thử các trang và hướng dẫn vận hành phần quản trị nội dung.

## Quản lý catalog

- [x] Rà soát biểu mẫu hiện tại và bổ sung các trường thông tin sản phẩm cần thiết.
- [x] Hoàn thiện tạo mới, chỉnh sửa, xóa và hiển thị preview ảnh sản phẩm.
- [x] Kiểm thử build và luồng quản lý catalog trong Command Deck.

## Trạng thái bán hàng

- [x] Xác định quy tắc bán, ngừng bán và hết hàng cho storefront.
- [x] Thêm điều khiển trạng thái nhanh trong Command Deck và biểu mẫu sản phẩm.
- [x] Kiểm thử phản ánh trạng thái trên catalog và giỏ hàng.

## Vận hành đơn hàng và doanh thu

- [x] Xác định chỉ số doanh thu, phân loại trạng thái giao hàng và thông tin đơn cần chỉnh sửa.
- [x] Mở rộng schema đơn hàng bằng thông tin khách/giao nhận và trạng thái fulfillment.
- [x] Xây dựng dashboard biểu đồ, bộ lọc đơn và trình chỉnh sửa đơn hàng.
- [x] Kiểm thử build và luồng quản trị đơn hàng.

## Xác nhận chuyển khoản Zalo

- [x] Thiết kế thông điệp xác nhận, thông tin Zalo shop và trạng thái thanh toán.
- [x] Thêm trường cấu hình Zalo và migration trạng thái xác nhận thanh toán.
- [x] Bổ sung nút nhắn Zalo sau checkout và điều khiển đã/chưa thanh toán cho admin.
- [x] Kiểm thử build cùng luồng thanh toán cập nhật.

## Thông số kỹ thuật & liên hệ

- [x] Xác định cấu trúc thông số CPU/chip/RAM/ổ cứng và dữ liệu liên hệ cần hiển thị.
- [x] Thêm migration thông số kỹ thuật và trường liên hệ vào CMS/admin.
- [x] Hiển thị thông số kỹ thuật trong catalog/quick view cùng liên hệ Zalo chân trang.
- [x] Kiểm thử build và luồng chỉnh sửa dữ liệu mở rộng.

## Liên hệ người bán

- [x] Xác định CTA liên hệ người bán và dữ liệu Zalo có thể cấu hình.
- [x] Thêm liên kết Zalo người bán trên storefront và trường chỉnh sửa trong Command Deck.
- [x] Kiểm thử liên kết người bán trên website gốc.

## Săn sale & ưu đãi đơn hàng

- [x] Thiết kế quy tắc chương trình sale, mã giảm giá và điều kiện áp dụng theo đơn.
- [x] Thêm migration chương trình sale và dữ liệu giảm giá cho orders.
- [x] Xây dựng giao diện săn sale, nhập mã ưu đãi và quản trị sale trong Command Deck.
- [x] Kiểm thử tính giá ưu đãi, tạo đơn và thao tác quản trị sale.

## Khắc phục thông số và gian hàng

- [x] Xác định nguyên nhân thông số kỹ thuật không hiển thị trên storefront.
- [x] Sửa renderer thông số và hoàn thiện card gian hàng cùng trường quản trị tương ứng.
- [x] Kiểm thử storefront và Command Deck sau khắc phục.

## Chuẩn hóa GitHub, Supabase và tài liệu

- [x] Rà soát asset, SQL migration, Markdown và cấu hình GitHub/Supabase hiện có.
- [x] Gom asset đã dùng vào repository và hợp nhất các SQL migration.
- [x] Tạo mục lục Markdown và quy trình áp dụng schema Supabase sau khi kết nối.
- [x] Kiểm thử cấu trúc, đồng bộ GitHub và xác nhận bản phát hành.

## Xác thực email Supabase

- [x] Khôi phục quyền truy cập Supabase Dashboard hoặc xác định kênh cấu hình thay thế.
- [x] Tắt yêu cầu xác nhận email cho đăng ký tài khoản (`mailer_autoconfirm = true`).
- [x] Kiểm thử thực tế đăng ký và đăng nhập Supabase ngay không cần email confirm; đã dọn dẹp tài khoản dùng một lần sau test.

## Hướng dẫn public trên GitHub

- [x] Soạn hướng dẫn triển khai, kết nối và vận hành NEXORA từ A–Z.
- [x] Rà soát để không công khai secret, tài khoản hay dữ liệu nhạy cảm.
- [x] Liên kết hướng dẫn mới vào chỉ mục tài liệu và README.

## Quản lý tài khoản, ví và thông báo

- [x] Cấp quyền Command Deck cho minhduc290613@outlook.com sau khi xác minh tài khoản Supabase.
- [x] Gỡ Telegram Bot, webhook và tài liệu/secret liên quan theo yêu cầu mới.
- [x] Khắc phục module tài khoản không hiển thị trên Command Deck sau nâng cấp backend.
- [x] Thiết kế profile, trạng thái tài khoản, cảnh cáo và sổ cái số dư có audit log.
- [x] Thêm quản trị khóa/mở khóa, cảnh cáo, điều chỉnh số dư và duyệt yêu cầu nạp tiền.
- [x] Thêm khu vực tài khoản khách: hồ sơ, đổi email/mật khẩu, số dư và yêu cầu nạp Zalo.
- [x] Kiểm thử RLS, build, route Command Deck và tài liệu vận hành.
- [x] Kiểm thử thủ công luồng điều chỉnh số dư bằng tài khoản admin và khách thật: cộng/trừ 1.000 ₫, kiểm tra sổ cái/audit log, hoàn tác về 0 ₫.

## Role, nội dung, affiliate và vận hành mở rộng

- [x] Rà soát yêu cầu từ ảnh và xác nhận mô hình role/quyền theo từng chức năng.
- [x] Thêm phân quyền admin, moderator, order manager, marketing và affiliate có audit log.
- [x] Hoàn thiện bài viết cho marketing/moderator/admin/affiliate bằng trang đọc đầy đủ, cùng bình luận–đánh giá có kiểm duyệt.
- [x] Thêm điều kiện affiliate, link giới thiệu và hoa hồng 15% theo đơn đủ điều kiện.
- [x] Hoàn thiện bộ lọc thông số kỹ thuật, gán sản phẩm–gian hàng có quản trị và xác minh luồng hoàn tiền.
- [x] Thêm cấu hình thanh toán/Zalo, xuất CSV và CMS điều khiển nhận diện/hiệu ứng storefront.
- [x] Đồng bộ module role/content/affiliate/refund vào schema canonical và kiểm thử đầu-cuối role, moderation, hoa hồng, hoàn tiền, CSV.
- [x] Thêm cấu hình admin cho tỷ lệ hoa hồng affiliate, điều kiện đơn delivered và yêu cầu duyệt; kiểm thử thay đổi 12,5% rồi khôi phục 15%.
- [x] Kiểm thử E2E comment: tạo fixture pending, ẩn bằng moderation, xác nhận reviewed_by/reviewed_at và dọn fixture/audit; không tạo review/rating giả.
- [x] Hoãn kiểm thử E2E review thật theo xác nhận người dùng ngày 25/08/2026; guard review, UI và moderation chung đã được kiểm tra, còn review thật sẽ xác minh khi có khách đã nhận hàng gửi nội dung.
- [x] Kiểm thử trực tiếp RPC tạo bài với toàn bộ role marketing, moderator, admin và affiliate bằng draft kỹ thuật có thu dọn.
- [x] Hiển thị nút bình luận dễ tìm từ thẻ sản phẩm và/hoặc Quick View, mở đúng khu vực gửi bình luận có trạng thái pending.
- [x] Bổ sung thao tác đăng xuất rõ ràng trong Account Center và xác minh session Supabase được kết thúc đúng.
- [x] Kiểm thử E2E bình luận kỹ thuật trung tính: pending → hidden, có reviewed_by/reviewed_at và dọn fixture/audit.
- [x] Kiểm thử đăng xuất Supabase với tài khoản disposable: xác minh session bị xóa, rồi dọn tài khoản test.
- [x] Mở rộng chứng cứ fixture bình luận: ghi nhận trạng thái pending ban đầu và xác nhận audit moderation bị dọn.
- [x] Hiển thị thông báo/badge trong Command Deck khi có bình luận hoặc đánh giá mới ở trạng thái chờ duyệt.
- [x] Cho phép mở thẳng workspace kiểm duyệt từ thông báo và kiểm thử cập nhật số lượng chờ xử lý.
- [x] Mở rộng Realtime moderation để bắt cả UPDATE chuyển review/bình luận sang `pending`, không chỉ INSERT.
- [x] Kiểm thử E2E notification với comment kỹ thuật `UPDATE → pending`, xác nhận badge/notice tăng rồi giảm sau moderation; unit test xác nhận cùng payload review upsert mà không tạo review/rating giả.
- [x] Sửa menu ba gạch mobile để mở/đóng điều hướng storefront rõ ràng, có thể dùng bàn phím và không che nội dung.
- [x] Mở rộng Command Deck để admin chỉnh nhanh nhận diện và CMS: tên website, mô tả SEO, logo, favicon/icon, banner, nội dung giới thiệu/liên hệ/cấu hình có thể vận hành.
- [x] Thêm quản trị role chỉ dành cho admin: tạo role tùy chỉnh, đổi tên, xóa role an toàn và chỉnh capability; moderator chỉ dùng quyền đã được cấp.
- [x] Chuẩn hóa nhãn khu vực CSV thành “Xuất CSV”.
- [x] Hợp nhất toàn bộ SQL dự án về một file canonical duy nhất, cập nhật tài liệu và cưỡng chế không tạo migration SQL rời trong các thay đổi sau.
- [x] Thêm script kiểm tra repository chỉ cho phép `supabase-unified.sql` trong nhóm schema Supabase trước khi `pnpm check` và `pnpm build`.
- [x] Bổ sung loading animation mượt, có hỗ trợ trợ năng, khi storefront đang chờ dữ liệu Supabase.
- [x] Khắc phục dứt điểm menu ba gạch mobile, bổ sung shortcut tài khoản cạnh menu và kiểm thử chạm/keyboard trên mobile.
- [x] Bổ sung English mode cho các nhãn giao diện storefront có thể dịch trực tiếp.
- [x] Thêm loading cục bộ khi tìm kiếm/lọc catalog, retry cho lỗi tải dữ liệu và ảnh catalog responsive/lazy loading.
- [x] Bổ sung upload ảnh trực tiếp cho logo/favicon/OG image trong Command Deck bằng kho lưu trữ dự án.
- [x] Ghi và hiển thị lịch sử thay đổi role an toàn trong Command Deck.
- [x] Bổ sung bộ lọc khoảng ngày cho các xuất CSV quản trị.
- [x] Hoàn thiện English mode cho toàn bộ storefront: filter, trạng thái empty/loading/retry, giỏ hàng/checkout, sale hunt, FAQ/help/trust/footer và CTA còn lại.
- [x] Kiểm thử chuyển ngôn ngữ end-to-end ở desktop/mobile để xác nhận mọi nhãn đồng bộ và không phát sinh lỗi runtime.
- [x] Bổ sung trường CMS English tùy chọn cho FAQ, Brand và trang hướng dẫn; khi chưa có bản dịch đã lưu, sử dụng bản dịch mặc định thay vì thay đổi nội dung CMS đang công bố.
- [x] Kiểm thử chuyển EN/VI qua toggle trên DOM desktop, responsive mobile bằng `?lang=en`, cùng các vùng header, filter, retry, sale, cart, help/trust/footer, FAQ và console sạch.
- [x] Chẩn đoán và khôi phục đồng bộ tài khoản Auth mới vào Command Deck, gồm quyền đọc/tạo profile-role an toàn.
- [x] Thêm luồng nút “Đã thanh toán” dẫn xác nhận Zalo với lời nhắn cấu hình được, không tự xác nhận giao dịch tài chính.
- [x] Xây dựng trang Đơn hàng khách hàng: danh sách, chi tiết, trạng thái thanh toán/giao nhận, nhà vận chuyển, mã vận đơn và nơi hàng đã đến.
- [x] Bổ sung quản trị nhà vận chuyển, logo, ghi chú, điểm đến và timeline/vòng tròn hành trình đơn hàng trong Command Deck.
- [x] Thêm capability role nhân viên kiểm hàng và giới hạn thao tác vận chuyển cho nhân viên kiểm hàng, moderator và quản trị viên.
- [x] Xác minh trigger signup, backfill 4/4 Auth-profile-role-wallet, role logistics, giao diện admin/khách, console, test, typecheck, build và tài liệu vận hành trước phát hành.
- [x] Cấu hình build multipage để `orders.html` được xuất bản production và kiểm tra route sau build.
- [x] Sửa chuyển workspace Command Deck để chỉ một view hiển thị tại một thời điểm, rồi kiểm thử Tài khoản/Role/Logistics.
- [x] Kiểm thử an toàn RPC lưu/xóa nhà vận chuyển với bản ghi tạm tự dọn; form cập nhật hành trình không được dùng để ghi dữ liệu vận chuyển giả vào đơn khách thực.
- [x] Bổ sung tra cứu và bộ lọc nâng cao trong quản lý đơn theo mã đơn, mã vận đơn, khách hàng, nhà vận chuyển và trạng thái vận hành.
- [x] Kiểm thử UI tìm theo mã vận đơn và lọc nhà vận chuyển bằng fixture tạm tự dọn, không sửa dữ liệu đơn khách thực.
- [x] Chuẩn hóa URL redirect email production, loại bỏ localhost và cho phép admin quản lý site URL an toàn.
- [x] Bổ sung workspace SMTP chỉ cho admin trong Command Deck, giữ secret không hiển thị lại sau khi lưu.
- [x] Hoàn thiện hướng dẫn A–Z về custom SMTP, DNS/domain, redirect URL và xử lý link localhost.
- [x] Rà soát và cải thiện trải nghiệm storefront/Command Deck trên mobile.
- [x] Thay yêu cầu xem mật khẩu bằng reset mật khẩu an toàn, dùng URL production thay vì localhost.
- [x] Bổ sung xóa tài khoản có xác nhận cho admin và yêu cầu tự xóa cho khách, bảo toàn dữ liệu đơn phục vụ đối soát.
- [x] Dùng tín hiệu lỗi callback Supabase đáng tin cậy thay timeout để báo recovery hết hạn/không hợp lệ, tránh lỗi giả khi mạng chậm.
- [x] Kiểm thử browser với callback recovery hết hạn/không hợp lệ, xác nhận modal gửi lại link và URL được dọn.
- [x] Hoãn theo yêu cầu người dùng: kiểm thử recovery qua mailbox/Supabase Auth thực tế sẽ thực hiện sau khi người dùng nhập SMTP/Hook provider.
- [x] Hoãn theo yêu cầu người dùng: kiểm thử end-to-end Quên mật khẩu bằng email thật sẽ thực hiện sau khi SMTP/Hook được kích hoạt.
- [x] Hoãn theo yêu cầu người dùng: không kích hoạt SMTP/Send Email Hook thật cho đến khi người dùng tự nhập provider secret và xác minh sender domain.
- [x] Mở rộng Command Deck để hướng dẫn/kích hoạt đồng thời SMTP trực tiếp và Send Email Hook, không lưu secret ở browser/database.
- [x] Thêm form admin chỉnh nội dung email Quên mật khẩu với biến callback an toàn và preview.
- [x] Bổ sung hướng dẫn SMTP nhanh dùng placeholder domain để người dùng tự thay domain production của họ.
- [x] Chẩn đoán và sửa lỗi không thể nhập mật khẩu trong modal đăng nhập trên desktop/mobile.
- [x] Chẩn đoán và khắc phục thông báo không thể đồng bộ catalog, bảo đảm storefront tải dữ liệu chính xác.
- [x] Sửa menu ba gạch mobile để mở/đóng điều hướng ổn định và không che nội dung.
- [x] Chuyển khách đến trang Đơn hàng ngay sau khi thanh toán bằng số dư thành công.
- [x] Bảo toàn quy tắc chuyển khoản chỉ đổi sang đã thanh toán sau thao tác xác nhận của shop.
- [x] Cải thiện Command Deck để ưu tiên hiển thị đơn chuyển khoản đang chờ và giúp admin xác nhận Đã thanh toán có kiểm soát.
- [x] Chẩn đoán và khắc phục lỗi không truy cập được Command Deck/máy chủ hoặc không đăng nhập được phiên quản trị.
- [x] Bổ sung thanh toán ZaloPay qua QR/chuyển khoản thủ công, cấu hình được từ Admin và chỉ xác nhận sau đối soát.
- [x] Làm nổi bật vùng QR ZaloPay trong modal thanh toán và bổ sung hướng dẫn quét mã rõ ràng cho khách, responsive trên mobile.
- [x] Thêm nút sao chép nội dung chuyển khoản và số tài khoản dưới mã QR ZaloPay, có phản hồi trạng thái và hỗ trợ mobile.
- [x] Rà soát và thiết kế phương thức CK tự động qua nhà cung cấp được ủy quyền, giữ đối soát thủ công làm phương án dự phòng.
- [x] Bổ sung cấu hình quản trị CK tự động không lộ secret, webhook ký số và kiểm soát an toàn chống xác nhận sai đơn.
- [x] Hoãn kiểm thử và kích hoạt nhà cung cấp CK tự động theo quyết định người dùng; phương thức giữ tắt an toàn cho đến khi shop tự cấu hình sau.
- [x] Hỗ trợ chọn một trong ba nhà cung cấp CK tự động: VietQR Host2Host, SePay hoặc Casso trong Command Deck.
- [x] Hiển thị trạng thái secret CK tự động đã cấu hình/ chưa cấu hình và hướng dẫn thay thế an toàn, không lưu secret trong Admin hoặc database.
- [x] Mở rộng khu vực Tài khoản & số dư trên màn hình desktop và giữ nguyên bố cục mobile.
