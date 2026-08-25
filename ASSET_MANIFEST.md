# NEXORA Asset Manifest

Tài liệu này ghi nhận các tài nguyên media được storefront sử dụng. Để tránh làm nặng bản deploy, binary asset không được đặt trong source branch `main`; chúng đã được xuất bản ở nhánh GitHub **[`assets`](https://github.com/minhduc290613/tech-ecommerce-store/tree/assets/media)**, đường dẫn `media/`.

| Tài nguyên | Tên trên nhánh `assets` | Định dạng thực tế | SHA-256 |
| --- | --- | --- | --- |
| Flash sale artwork | `media/nexora-flash-sale_aae9082a.jpg` | WebP | `85ab7528337da868d3c7928a3741d1067925efbc17b9c135574db13f083d7806` |
| Hero artwork | `media/nexora-hero-tech_47c6b78f.jpg` | WebP | `d40ff57a9915a650cee9664a9c27824bc4919f658a83ddb608535e659940c905` |
| Laptop category artwork | `media/nexora-laptop-category_9690fafd.jpg` | WebP | `605c8a6564a6b444b3220d97ebafb96bb0a4c371de1cc3c616d18c751844019f` |
| NEXORA logo | `media/nexora-logo_3c03446b.png` | WebP | `86d77c63910f3ea1d0123dec3c5482d56bca1e16663692e7ce73009cfdc99d53` |
| Phone category artwork | `media/nexora-phone-category_b50b5ab7.jpg` | WebP | `2b5f6e17003a113c2b91414bd170466d4565195806e35e4c3242c7951c84777b` |

## Ảnh catalog mẫu

Sáu ảnh sản phẩm dưới đây được lưu tại `media/products/` trên nhánh `assets` để backup tất cả ảnh đang được tham chiếu bởi catalog mẫu/fallback. Chúng có nguồn tham chiếu từ Unsplash; cần tuân thủ điều khoản nguồn ảnh tương ứng khi vận hành thương mại.

| Sản phẩm | Tên trên nhánh `assets` | SHA-256 |
| --- | --- | --- |
| NEXORA Photon X Pro | `media/products/photon-x-pro.jpg` | `bc81253cb23c93a21409d1b6b8cd16132281c4f744e648d1f0cd391c0ca7c684` |
| Orion Book Air 14 | `media/products/orion-book-air-14.jpg` | `726968598b945d8c413e65d79f081e573e88a2c597ecde63172bfa8882551a6a` |
| Pulse Buds ANC | `media/products/pulse-buds-anc.jpg` | `352ba0cd5c96a17f633d7f2c25eedb386066574f207c8e2bdd5587ec621e9128` |
| Vertex Phone S | `media/products/vertex-phone-s.jpg` | `35cce3948338353ab4b19e4d251f371e31c7c7ab593ae9968fd0d8bde25b068d` |
| Apex Station 16 | `media/products/apex-station-16.jpg` | `9cf22225f126e37a0917bf9ab7059ce488e371d1c45e66ee61d542adca3631a6` |
| NEXORA Flux 65 Mechanical | `media/products/flux-65-mechanical.jpg` | `3175501aa10410c4d6c497f93ef6bfbaab295413fae15e122a2294c8c56d7f9a` |

Hiện không có video được storefront tham chiếu. Khi thêm video mới, đưa bản gốc vào nhánh `assets` và cập nhật bảng này với tên, định dạng, kích thước và checksum.

> Website vẫn dùng URL storage để tránh phụ thuộc vào raw GitHub khi tải trang. Nhánh `assets` là kho source/backup có thể truy xuất từ GitHub. Xem thêm [chỉ mục tài liệu](docs/INDEX.md).
