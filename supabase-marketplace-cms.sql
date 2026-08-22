-- ============================================================================
-- NEXORA Marketplace CMS
-- Chạy SAU supabase-schema.sql và supabase-admin.sql.
-- Các trang điều khoản/bảo mật được seed dưới dạng nội dung mẫu vận hành;
-- hãy để luật sư hoặc bộ phận pháp chế rà soát trước khi áp dụng chính thức.
-- ============================================================================

create table if not exists public.site_settings (
  singleton boolean primary key default true check (singleton),
  site_name text not null default 'NEXORA',
  site_tagline text not null default 'Thiết bị đúng chuẩn. Mức giá đúng thời điểm.',
  announcement_text text not null default 'Freeship toàn quốc cho đơn từ 1.500.000đ',
  support_email text not null default 'support@nexora.vn',
  support_hours text not null default 'Thứ 2 — Thứ 7 / 09:00–18:00',
  address_text text not null default 'Việt Nam',
  logo_url text,
  hero_kicker text not null default 'CURATED TECH / 2026',
  hero_title text not null default 'Thiết bị đúng chuẩn.',
  hero_emphasis text not null default 'Mức giá đúng thời điểm.',
  hero_description text not null default 'Chọn nhanh những thiết bị công nghệ đáng đầu tư — được phân loại rõ ràng, ưu đãi minh bạch và sẵn sàng giao đến bạn.',
  hero_image_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_pages (
  slug text primary key check (slug in ('about', 'terms', 'privacy', 'shipping-returns', 'seller-guide', 'contact')),
  title text not null,
  subtitle text not null default '',
  content text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  category text not null,
  banner_url text,
  contact_email text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faqs_published_order_idx on public.faqs(is_published, sort_order);
create index if not exists shops_active_category_idx on public.shops(is_active, category);

alter table public.site_settings enable row level security;
alter table public.site_pages enable row level security;
alter table public.faqs enable row level security;
alter table public.shops enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select using (true);
drop policy if exists "Public can read site pages" on public.site_pages;
create policy "Public can read site pages" on public.site_pages for select using (true);
drop policy if exists "Public can read published faqs" on public.faqs;
create policy "Public can read published faqs" on public.faqs for select using (is_published = true);
drop policy if exists "Public can read active shops" on public.shops;
create policy "Public can read active shops" on public.shops for select using (is_active = true);

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage site pages" on public.site_pages;
create policy "Admins can manage site pages" on public.site_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage faqs" on public.faqs;
create policy "Admins can manage faqs" on public.faqs for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage shops" on public.shops;
create policy "Admins can manage shops" on public.shops for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (singleton, logo_url, hero_image_url)
values (true, '/manus-storage/nexora-logo_3c03446b.png', '/manus-storage/nexora-hero-tech_47c6b78f.jpg')
on conflict (singleton) do nothing;

insert into public.site_pages (slug, title, subtitle, content)
values
  ('about', 'Về NEXORA', 'Nền tảng công nghệ chọn lọc, minh bạch và có trách nhiệm.', 'NEXORA kết nối người mua với các thiết bị công nghệ được mô tả rõ ràng về giá, ưu đãi và tình trạng hàng hóa.\n\nChúng tôi ưu tiên thông tin dễ kiểm tra, trải nghiệm mua sắm gọn gàng và hỗ trợ sau đơn qua các kênh công bố trên website.\n\nMọi mô tả sản phẩm, chương trình giá và điều kiện dịch vụ có thể được cập nhật để phù hợp với tình trạng vận hành thực tế.'),
  ('terms', 'Điều khoản sử dụng', 'Bản nội dung vận hành — cần rà soát pháp lý trước khi công bố chính thức.', 'Khi truy cập hoặc sử dụng NEXORA, bạn đồng ý tuân thủ các quy định hiển thị trên website và sử dụng dịch vụ cho mục đích hợp pháp.\n\nGiá, tồn kho, ưu đãi và thời gian xử lý đơn có thể thay đổi theo thông tin công bố tại thời điểm đặt hàng. NEXORA có thể liên hệ để xác minh đơn, làm rõ thông tin giao nhận hoặc xử lý trường hợp dữ liệu không chính xác.\n\nNội dung này là bản khởi tạo cho website. Chủ sở hữu gian hàng cần thay thế/bổ sung pháp nhân, phạm vi dịch vụ, cơ chế giải quyết tranh chấp và luật áp dụng trước khi đưa vào sử dụng chính thức.'),
  ('privacy', 'Chính sách bảo mật', 'Cách NEXORA tiếp cận dữ liệu tài khoản và đơn hàng.', 'NEXORA chỉ xử lý thông tin cần thiết để tạo tài khoản, xử lý đơn hàng, hỗ trợ khách hàng và cải thiện trải nghiệm dịch vụ.\n\nThông tin đăng nhập được xử lý bởi Supabase Auth; website không lưu mật khẩu thô trong mã nguồn frontend. Dữ liệu đơn hàng chỉ được người dùng sở hữu hoặc tài khoản quản trị được cấp quyền truy cập theo chính sách RLS.\n\nTrước khi vận hành, hãy bổ sung đầu mối liên hệ về quyền riêng tư, thời hạn lưu trữ, đơn vị xử lý dữ liệu và cơ chế yêu cầu truy cập/xóa dữ liệu phù hợp với nghĩa vụ pháp lý của đơn vị vận hành.'),
  ('shipping-returns', 'Giao hàng và đổi trả', 'Thông tin quy trình trước khi hoàn tất đơn hàng.', 'Thời gian giao hàng, chi phí vận chuyển và khu vực phục vụ được xác nhận theo từng đơn hàng. Khách nên kiểm tra thông tin liên hệ, địa chỉ và tình trạng sản phẩm trước khi thanh toán.\n\nYêu cầu đổi trả cần được gửi qua kênh hỗ trợ cùng mã đơn, hình ảnh tình trạng sản phẩm và mô tả vấn đề. Quyết định xử lý phụ thuộc vào tình trạng hàng hóa, điều kiện bảo hành và chính sách đã công bố.\n\nHãy cập nhật thời hạn đổi trả, chi phí phát sinh, quy trình hoàn tiền và chính sách hàng không đủ điều kiện trước khi vận hành thật.'),
  ('seller-guide', 'Dành cho gian hàng', 'Nguyên tắc trình bày sản phẩm và phục vụ người mua.', 'Gian hàng cần cung cấp thông tin hàng hóa trung thực, bao gồm mô tả, giá, tình trạng tồn kho, bảo hành và điều kiện giao hàng.\n\nKhông đăng tải nội dung vi phạm pháp luật, xâm phạm quyền sở hữu trí tuệ, gây hiểu nhầm về giá hoặc mô phỏng đánh giá người dùng.\n\nQuản trị viên có thể rà soát, cập nhật hoặc tạm ngưng hiển thị gian hàng/sản phẩm khi phát hiện thông tin không đầy đủ hoặc có dấu hiệu rủi ro.'),
  ('contact', 'Trung tâm hỗ trợ', 'Kênh liên hệ và quy trình phản hồi của NEXORA.', 'Để được hỗ trợ về đơn hàng, sản phẩm hoặc chính sách, hãy liên hệ qua email hiển thị trên website và cung cấp mã đơn nếu có.\n\nNEXORA tiếp nhận yêu cầu trong khung giờ hỗ trợ công bố. Với nội dung cần đối soát thanh toán hoặc xác minh thông tin, thời gian phản hồi có thể phụ thuộc vào dữ liệu kèm theo.\n\nChủ sở hữu website nên cập nhật địa chỉ, hotline, email phụ trách và thời gian phản hồi trước khi vận hành chính thức.')
on conflict (slug) do nothing;

insert into public.faqs (question, answer, sort_order, is_published)
values
  ('Tôi có cần tạo tài khoản để đặt hàng không?', 'Bạn có thể xem catalog mà không cần đăng nhập. Để tạo đơn hàng và đồng bộ trạng thái thanh toán, bạn cần đăng nhập bằng email.', 10, true),
  ('Giá sản phẩm có thể thay đổi không?', 'Giá và ưu đãi hiển thị tại thời điểm bạn xem catalog có thể thay đổi khi chương trình khuyến mại kết thúc hoặc tồn kho được cập nhật.', 20, true),
  ('Làm thế nào để thanh toán đơn hàng?', 'Sau khi tạo đơn, website hiển thị VietQR hoặc MoMo tùy cấu hình. Hãy kiểm tra đúng mã đơn và số tiền trước khi xác nhận giao dịch.', 30, true),
  ('Tôi kiểm tra trạng thái đơn ở đâu?', 'Sau khi hệ thống triển khai lịch sử đơn cho khách hàng, bạn có thể kiểm tra qua tài khoản. Trong giai đoạn hiện tại, hãy liên hệ hỗ trợ kèm mã đơn.', 40, true),
  ('Tôi muốn đổi trả hoặc bảo hành thì làm gì?', 'Hãy gửi mã đơn, mô tả và hình ảnh liên quan đến kênh hỗ trợ. Nhóm vận hành sẽ phản hồi theo chính sách giao hàng và đổi trả đang công bố.', 50, true),
  ('Làm sao để đăng ký gian hàng?', 'Liên hệ quản trị viên qua email hỗ trợ. Sau khi thông tin được xác minh, gian hàng có thể được tạo và hiển thị trong danh mục đối tác.', 60, true)
on conflict do nothing;

insert into public.shops (name, slug, description, category, banner_url, contact_email, is_verified, is_active)
values
  ('NEXORA Select', 'nexora-select', 'Khu vực tuyển chọn thiết bị chính hãng, phụ kiện thiết yếu và các ưu đãi theo mùa.', 'Công nghệ tuyển chọn', '/manus-storage/nexora-hero-tech_47c6b78f.jpg', 'support@nexora.vn', true, true),
  ('Nova Mobile', 'nova-mobile', 'Gian hàng thiết bị di động, phụ kiện bảo vệ và tư vấn lựa chọn theo nhu cầu sử dụng.', 'Điện thoại', '/manus-storage/nexora-phone-category_b50b5ab7.jpg', 'support@nexora.vn', true, true),
  ('Orion Compute', 'orion-compute', 'Gian hàng laptop và giải pháp làm việc di động cho học tập, sáng tạo và doanh nghiệp nhỏ.', 'Laptop', '/manus-storage/nexora-laptop-category_9690fafd.jpg', 'support@nexora.vn', true, true)
on conflict (slug) do nothing;
