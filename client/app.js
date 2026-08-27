/* Circuit Atelier — Vanilla JS storefront logic: Supabase, catalogue, cart and payment signal. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { COMMENT_ACTION, getCommunityFocusTarget } from "./product-community-actions.js";
import { setBusyRegion, setLoadingSurface } from "./loading-state.js";
import { getAuthRedirectUrl } from "./public-url.js";
import { hasRecoveryCallbackError, isPasswordRecoveryEvent, isRecoveryCallback, stripRecoveryParameters } from "./auth-recovery.js";
import { canReplaceTranslationText } from "./translation-safety.js";
import { getWalletPaymentOrdersUrl } from "./payment-redirect.js";
import { getTrustedZaloPayQrUrl } from "./zalopay-qr.js";
import { getPaymentPresentation } from "./payment-presentation.js";
import { getZaloPayCopyActions } from "./payment-copy-actions.js";
import { getAutoTransferPresentation } from "./auto-transfer-payment.js";
import { getCheckoutDelivery } from "./checkout-delivery.js";
import { normalizeDeliveryProfile } from "./account-delivery.js";
import { normalizeSignupUsername } from "./signup-username.js";
import { productGalleryUrls } from "./product-gallery.js";
import { buildProductShareText, buildProductShareUrl } from "./product-sharing.js";
import "./product-gallery.css";

const UI_TRANSLATIONS = {
  vi: { discover: "Khám phá", discoverProducts: "Khám phá sản phẩm", flashSale: "Flash Sale", categories: "Danh mục", shops: "Gian hàng", journal: "Bài viết", help: "Trợ giúp", exploreDeals: "Khám phá ưu đãi", viewFlashSale: "Xem Flash Sale", searchPlaceholder: "Tìm thiết bị, phụ kiện...", mobileSearchPlaceholder: "Tìm kiếm trong NEXORA", skipCatalog: "Đi tới danh sách sản phẩm", loaderTitle: "Đang đưa thiết bị lên màn hình", loaderDetail: "Chờ một nhịp để đồng bộ catalog và ưu đãi.", storeOnline: "Storefront online", curatedDevices: "Thiết bị tuyển chọn", orderResponse: "Phản hồi đơn hàng", productSupport: "Hỗ trợ sản phẩm", flashHeading: "Flash Sale<br /><em>đang truyền tín hiệu.</em>", flashDescription: "Giá ưu đãi chỉ mở trong khung giờ này. Hãy thêm sản phẩm trước khi đồng hồ quay về 00.", huntNow: "Săn giá ngay", saleHuntHeading: "Săn mã đúng nhịp.<br /><em>Giảm thẳng vào đơn.</em>", saleHuntDescription: "Chọn một mã đang mở, mã sẽ được đưa vào giỏ. Tổng ưu đãi cuối cùng luôn được kiểm tra lại khi tạo đơn.", catalogHeading: "Thiết bị<br /><em>đang bắt sóng.</em>", clearFilters: "Xóa lọc", categoryLabel: "Danh mục", allDevices: "Tất cả thiết bị", phones: "Điện thoại", accessories: "Phụ kiện", priceRange: "Khoảng giá", saleOnly: "Chỉ xem đang SALE", filterNote: "Giá đã hiển thị là giá hiện tại. Các ưu đãi Flash Sale có thể kết thúc sớm.", catalogUnavailable: "Không thể đồng bộ catalog mới nhất.", catalogFallback: "Đang hiển thị dữ liệu dự phòng để bạn tiếp tục xem sản phẩm.", retry: "Thử lại", emptyTitle: "Không tìm thấy tín hiệu phù hợp.", emptyDetail: "Điều chỉnh bộ lọc hoặc thử một từ khóa khác.", resetFilters: "Thiết lập lại bộ lọc", shopsHeading: "Gian hàng<br /><em>đang được xác minh.</em>", shopsDescription: "Khám phá các không gian công nghệ theo nhu cầu, có mô tả hoạt động và đầu mối hỗ trợ rõ ràng.", sellerStandard: "Tìm hiểu về tiêu chuẩn gian hàng", helpHeading: "Câu hỏi có<br /><em>tín hiệu rõ ràng.</em>", helpDescription: "Thông tin về tài khoản, thanh toán và hỗ trợ sau đơn được tập hợp ở một nơi.", helpCenter: "Đến trung tâm hỗ trợ", trustHeading: "Mua sắm với<br />thông tin rõ ràng.", trustDescription: "Các chính sách và hướng dẫn được công bố tập trung để bạn xem trước khi giao dịch.", shippingReturns: "Giao hàng & đổi trả", shippingReturnsDetail: "Quy trình và thông tin cần chuẩn bị", privacy: "Bảo mật dữ liệu", privacyDetail: "Nguyên tắc xử lý tài khoản và đơn hàng", terms: "Điều khoản sử dụng", termsDetail: "Các nguyên tắc vận hành nền tảng", about: "Về NEXORA", aboutDetail: "Cam kết về trải nghiệm và minh bạch", clearInfo: "Minh bạch thông tin", clearInfoDetail: "Mô tả, giá và ưu đãi hiển thị rõ ràng.", carefulPacking: "Đóng gói cẩn thận", carefulPackingDetail: "Kiểm tra thiết bị trước khi bàn giao.", afterOrderSupport: "Hỗ trợ sau đơn", afterOrderSupportDetail: "Đội ngũ NEXORA sẵn sàng phản hồi.", storeAdmin: "Quản trị cửa hàng", cartTitle: "Giỏ hàng", subtotal: "Tạm tính", securePayment: "Thanh toán an toàn qua VietQR hoặc MoMo.", continueCheckout: "Tiếp tục thanh toán", authHeading: "Đăng nhập để<br /><em>đồng bộ đơn hàng.</em>", authIntro: "Tạo tài khoản hoặc đăng nhập bằng email để tiếp tục với thanh toán và quản lý đơn hàng.", login: "Đăng nhập", signup: "Đăng ký", passwordLabel: "Mật khẩu", passwordPlaceholder: "Tối thiểu 6 ký tự", inStock: "Còn hàng", nationwideDelivery: "Giao hàng toàn quốc", addToCart: "Thêm vào giỏ", orderCreated: "ĐƠN HÀNG ĐÃ ĐƯỢC TẠO", qrHeading: "Quét mã để<br /><em>hoàn tất thanh toán.</em>", devicesShown: (count) => `${count.toString().padStart(2, "0")} thiết bị đang hiển thị`, catalogLoading: "Đang đồng bộ catalog...", searchLoading: "Đang tìm trong catalog...", searchHint: "Đang lọc thiết bị phù hợp…", addCart: "Thêm giỏ", soldOut: "Hết hàng", comments: "Bình luận", useCode: "Dùng mã", noActiveSale: "Chưa có mã săn sale đang mở. Hãy quay lại trong đợt tiếp theo.", verified: "Đã xác minh", updating: "Đang cập nhật", contactSupport: "Liên hệ hỗ trợ", standard: "Tiêu chuẩn", emptyCart: "Giỏ hàng đang trống. Chọn một thiết bị để bắt đầu phiên mua sắm." },
  en: { discover: "Discover", discoverProducts: "Explore products", flashSale: "Flash Sale", categories: "Categories", shops: "Stores", journal: "Journal", help: "Help", exploreDeals: "Explore deals", viewFlashSale: "View Flash Sale", searchPlaceholder: "Search devices, accessories...", mobileSearchPlaceholder: "Search NEXORA", skipCatalog: "Skip to catalog", loaderTitle: "Bringing devices to your screen", loaderDetail: "One moment while catalog and deals sync.", storeOnline: "Storefront online", curatedDevices: "Curated devices", orderResponse: "Order response", productSupport: "Product support", flashHeading: "Flash Sale<br /><em>signal is live.</em>", flashDescription: "Special pricing is only open during this window. Add devices before the clock reaches zero.", huntNow: "Shop the drop", saleHuntHeading: "Catch the right code.<br /><em>Save directly on your order.</em>", saleHuntDescription: "Choose an active code and it will move to your cart. Final savings are always verified when the order is created.", catalogHeading: "Devices<br /><em>on signal.</em>", clearFilters: "Clear filters", categoryLabel: "Category", allDevices: "All devices", phones: "Phones", accessories: "Accessories", priceRange: "Price range", saleOnly: "Show sale items only", filterNote: "Displayed pricing is current pricing. Flash Sale offers may end early.", catalogUnavailable: "The latest catalog could not be synced.", catalogFallback: "Fallback items remain available while you retry.", retry: "Retry", emptyTitle: "No matching signal found.", emptyDetail: "Adjust a filter or try another keyword.", resetFilters: "Reset filters", shopsHeading: "Stores<br /><em>being verified.</em>", shopsDescription: "Explore technology spaces by need, with clear operating details and support contacts.", sellerStandard: "Learn store standards", helpHeading: "Questions with<br /><em>a clear signal.</em>", helpDescription: "Account, payment and post-order support details are collected in one place.", helpCenter: "Visit help center", trustHeading: "Shop with<br />clear information.", trustDescription: "Policies and guidance are published together for review before you transact.", shippingReturns: "Shipping & returns", shippingReturnsDetail: "Process and information to prepare", privacy: "Data privacy", privacyDetail: "How accounts and orders are handled", terms: "Terms of use", termsDetail: "Platform operating principles", about: "About NEXORA", aboutDetail: "A commitment to transparent experiences", clearInfo: "Clear information", clearInfoDetail: "Descriptions, pricing and promotions are plainly shown.", carefulPacking: "Careful packing", carefulPackingDetail: "Devices are checked before handover.", afterOrderSupport: "Post-order support", afterOrderSupportDetail: "The NEXORA team is ready to respond.", storeAdmin: "Store administration", cartTitle: "Cart", subtotal: "Subtotal", securePayment: "Secure checkout via VietQR or MoMo.", continueCheckout: "Continue to checkout", authHeading: "Sign in to<br /><em>sync your orders.</em>", authIntro: "Create an account or sign in by email to continue to checkout and order management.", login: "Sign in", signup: "Create account", passwordLabel: "Password", passwordPlaceholder: "At least 6 characters", inStock: "In stock", nationwideDelivery: "Nationwide delivery", addToCart: "Add to cart", orderCreated: "ORDER CREATED", qrHeading: "Scan to<br /><em>finish payment.</em>", devicesShown: (count) => `${count.toString().padStart(2, "0")} devices shown`, catalogLoading: "Syncing catalog...", searchLoading: "Searching catalog...", searchHint: "Finding matching devices…", addCart: "Add to cart", soldOut: "Sold out", comments: "Comments", useCode: "Use code", noActiveSale: "No active sale codes right now. Please check back later.", verified: "Verified", updating: "Updating", contactSupport: "Contact support", standard: "Standard", emptyCart: "Your cart is empty. Choose a device to start shopping." },
};

// ============================================================================
// 1) SUPABASE CONFIGURATION
// Điền Project URL và anon public key tại supabase-config.js.
// LƯU Ý: Không bao giờ đặt service_role key vào frontend.
// ============================================================================

// Điền thông tin nhận tiền trước khi sử dụng ở môi trường thật.
let PAYMENT_CONFIG = {
  bankId: "MB", // Ví dụ: MB, VCB, TCB, ACB... theo mã ngân hàng VietQR.
  accountNumber: "0123456789",
  accountName: "NEXORA TECH STORE",
  momoPhone: "0900000000",
};
const PLACEHOLDER_PAYMENT_VALUES = new Set(["", "0123456789", "0900000000", "NEXORA TECH STORE"]);

const LOCAL_DEMO_PRODUCTS = [
  { id: "demo-1", name: "NEXORA Photon X Pro 256GB", category: "Điện thoại", description: "Màn hình OLED 6.7 inch 120Hz, camera 50MP, vi xử lý flagship và sạc nhanh 80W.", image_url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85", price: 20990000, original_price: 24990000, stock: 18, is_sale: true, featured: true },
  { id: "demo-2", name: "Orion Book Air 14", category: "Laptop", description: "Laptop 14 inch mỏng nhẹ, chip hiệu năng cao, RAM 16GB, SSD 512GB cho công việc linh hoạt.", image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85", price: 18990000, original_price: 22990000, stock: 12, is_sale: true, featured: true },
  { id: "demo-3", name: "Pulse Buds ANC", category: "Phụ kiện", description: "Tai nghe không dây chống ồn chủ động, âm thanh không gian và pin sử dụng đến 30 giờ.", image_url: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85", price: 1490000, original_price: 2190000, stock: 40, is_sale: true, featured: true },
  { id: "demo-4", name: "Vertex Phone S 128GB", category: "Điện thoại", description: "Thiết kế titan bền bỉ, camera kép linh hoạt, pin cả ngày và màn hình sáng ngoài trời.", image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85", price: 14990000, original_price: 16990000, stock: 25, is_sale: true, featured: false },
  { id: "demo-5", name: "Apex Station 16", category: "Laptop", description: "Laptop hiệu năng sáng tạo với màn hình 16 inch, RAM 32GB, SSD 1TB và card đồ họa rời.", image_url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85", price: 32990000, original_price: 32990000, stock: 8, is_sale: false, featured: false },
  { id: "demo-6", name: "NEXORA Flux 65 Mechanical", category: "Phụ kiện", description: "Bàn phím cơ 65% kết nối ba chế độ, switch tuyến tính và đèn nền RGB tùy biến.", image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85", price: 1690000, original_price: 2490000, stock: 32, is_sale: true, featured: false },
];
const DEFAULT_SETTINGS = { site_name: "NEXORA", site_tagline: "Thiết bị đúng chuẩn.\nMức giá đúng thời điểm.", announcement_text: "Freeship toàn quốc cho đơn từ 1.500.000đ", support_email: "support@nexora.vn", support_hours: "Thứ 2 — Thứ 7 / 09:00–18:00", address_text: "Việt Nam", zalo_phone: "", zalo_confirmation_message: "Tôi đã chuyển khoản đơn {order_number} với số tiền {total}. Nhờ shop xác nhận giúp tôi.", logo_url: "/manus-storage/nexora-logo_3c03446b.png", favicon_url: "/manus-storage/nexora-logo_3c03446b.png", hero_kicker: "CURATED TECH / 2026", hero_title: "Thiết bị đúng chuẩn.", hero_emphasis: "Mức giá đúng thời điểm.", hero_description: "Chọn nhanh những thiết bị công nghệ đáng đầu tư — được phân loại rõ ràng, ưu đãi minh bạch và sẵn sàng giao đến bạn.", hero_image_url: "/manus-storage/nexora-hero-tech_47c6b78f.jpg", seo_title: "NEXORA Tech Store | Thiết bị đúng chuẩn", seo_description: "Khám phá điện thoại, laptop và phụ kiện với mức giá đúng thời điểm.", seo_og_image_url: "/manus-storage/nexora-hero-tech_47c6b78f.jpg" };
const ENGLISH_SETTING_FALLBACKS = { announcement_text: "Nationwide free shipping on orders from ₫1,500,000", site_tagline: "Curated technology.\nPricing at the right moment.", hero_kicker: "CURATED TECH / 2026", hero_title: "Technology,\ncarefully chosen.", hero_emphasis: "Priced for now.", hero_description: "Choose technology worth investing in, clearly categorized with transparent offers and ready for delivery.", seo_title: "NEXORA Tech Store | Curated technology", seo_description: "Explore phones, laptops and accessories with timely pricing." };

function applyFooterSettings(settings = DEFAULT_SETTINGS) {
  const credit = settings.footer_credit_text || `© ${new Date().getFullYear()} ${settings.site_name || "NEXORA"} Tech Store`;
  const status = settings.footer_status_text || "WEBSITE ĐANG HOẠT ĐỘNG";
  $("#footerCredit").textContent = credit;
  $("#footerSiteStatus").textContent = status;
  $("#footerSignal").classList.toggle("is-offline", settings.footer_status_online === false);
  $("#footerSignal").setAttribute("aria-label", status);
}

window.addEventListener("nexora:settings", (event) => applyFooterSettings(event.detail));
const DEFAULT_FAQS = [{ question: "Tôi có cần tạo tài khoản để đặt hàng không?", answer: "Bạn có thể xem catalog mà không cần đăng nhập. Để tạo đơn hàng và đồng bộ thanh toán, bạn cần đăng nhập bằng email." }, { question: "Giá sản phẩm có thể thay đổi không?", answer: "Giá và ưu đãi có thể thay đổi khi chương trình kết thúc hoặc tồn kho được cập nhật." }, { question: "Làm thế nào để thanh toán đơn hàng?", answer: "Sau khi tạo đơn, hãy quét VietQR hoặc MoMo và kiểm tra đúng mã đơn, số tiền trước khi xác nhận." }, { question: "Tôi muốn đổi trả hoặc bảo hành thì làm gì?", answer: "Gửi mã đơn, mô tả và hình ảnh liên quan đến kênh hỗ trợ để được hướng dẫn theo chính sách công bố." }];
const LEGACY_FAQ_EN = new Map([
  ["Tôi có cần tạo tài khoản để đặt hàng không?", { question: "Do I need an account to place an order?", answer: "You may browse the catalog without an account. To create an order and sync payment, sign in with your email." }],
  ["Giá sản phẩm có thể thay đổi không?", { question: "Can product prices change?", answer: "Prices and promotions may change when a campaign ends or inventory is updated." }],
  ["Làm thế nào để thanh toán đơn hàng?", { question: "How do I pay for an order?", answer: "After creating an order, scan VietQR or MoMo and verify the order number and amount before confirming payment." }],
  ["Tôi muốn đổi trả hoặc bảo hành thì làm gì?", { question: "How do returns or warranty requests work?", answer: "Send the order number, a description and relevant images to support for guidance under the published policy." }],
]);
const DEFAULT_SHOPS = [{ name: "NEXORA Select", category: "Công nghệ tuyển chọn", description: "Thiết bị chính hãng, phụ kiện thiết yếu và các ưu đãi theo mùa.", banner_url: "/manus-storage/nexora-hero-tech_47c6b78f.jpg", is_verified: true }, { name: "Nova Mobile", category: "Điện thoại", description: "Thiết bị di động, phụ kiện bảo vệ và tư vấn lựa chọn theo nhu cầu.", banner_url: "/manus-storage/nexora-phone-category_b50b5ab7.jpg", is_verified: true }, { name: "Orion Compute", category: "Laptop", description: "Laptop và giải pháp làm việc di động cho học tập, sáng tạo và doanh nghiệp nhỏ.", banner_url: "/manus-storage/nexora-laptop-category_9690fafd.jpg", is_verified: true }];
const DEFAULT_SALE_CAMPAIGNS = [{ id: "demo-hunt-cyan", code: "HUNTCYAN10", title: "Săn Sale Cyan 10%", description: "Giảm 10% cho đơn từ 3.000.000đ, tối đa 1.000.000đ.", badge_text: "SĂN SALE 10%", discount_type: "percent", discount_value: 10, minimum_order_amount: 3000000, maximum_discount_amount: 1000000, starts_at: new Date(Date.now() - 86400000).toISOString(), ends_at: new Date(Date.now() + 7 * 86400000).toISOString(), is_active: true, is_hunt_featured: true }];

const validSupabaseConfig = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = validSupabaseConfig && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.nexoraDb = db;

const state = {
  products: [],
  cart: safelyReadCart(),
  user: null,
  authMode: "login",
  activeProduct: null,
  lastOrder: null,
  activePaymentMethod: "vietqr", settings: DEFAULT_SETTINGS, faqs: DEFAULT_FAQS, shops: DEFAULT_SHOPS, saleCampaigns: DEFAULT_SALE_CAMPAIGNS, carriers: [], appliedSaleCode: "", affiliateShareCode: "", sharedProductOpened: false, locale: "vi", catalogLoadError: null, searchTimer: null,
  filters: { category: "all", maxPrice: 35000000, saleOnly: false, search: "", technical: {} },
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const els = {
  productsGrid: $("#productsGrid"), emptyState: $("#emptyState"), productCount: $("#productCount"), activeFilters: $("#activeFilters"), catalogRetry: $("#catalogRetry"), catalogRetryMessage: $("#catalogRetryMessage"), catalogRetryButton: $("#catalogRetryButton"),
  priceRange: $("#priceRange"), priceOutput: $("#priceOutput"), saleOnly: $("#saleOnly"), clearFilters: $("#clearFilters"), emptyReset: $("#emptyReset"),
  searchInput: $("#searchInput"), mobileSearchInput: $("#mobileSearchInput"), headerSearch: $("#headerSearch"), mobileSearchForm: $("#mobileSearchForm"), mobileSearchButton: $("#mobileSearchButton"), mobileMenuButton: $("#mobileMenuButton"), mobileAccountButton: $("#mobileAccountButton"), mobileNav: $("#mobileNav"), mobileNavScrim: $("#mobileNavScrim"), languageToggle: $("#languageToggle"),
  cartButton: $("#cartButton"), cartDrawer: $("#cartDrawer"), cartBadge: $("#cartBadge"), cartItemLabel: $("#cartItemLabel"), cartItems: $("#cartItems"), cartTotal: $("#cartTotal"), checkoutButton: $("#checkoutButton"), checkoutDelivery: $("#checkoutDelivery"), checkoutCustomerName: $("#checkoutCustomerName"), checkoutCustomerPhone: $("#checkoutCustomerPhone"), checkoutShippingAddress: $("#checkoutShippingAddress"),
  overlay: $("#overlay"), authButton: $("#authButton"), authModal: $("#authModal"), authForm: $("#authForm"), authEmail: $("#authEmail"), authEmailField: $("#authEmailField"), authPassword: $("#authPassword"), authPasswordField: $("#authPasswordField"), authPasswordConfirm: $("#authPasswordConfirm"), authPasswordConfirmField: $("#authPasswordConfirmField"), authUsername: $("#authUsername"), authUsernameField: $("#authUsernameField"), authDeliveryFields: $("#authDeliveryFields"), authDeliveryPhone: $("#authDeliveryPhone"), authDeliveryAddress: $("#authDeliveryAddress"), authSubmit: $("#authSubmit"), authTitle: $("#authTitle"), authIntro: $("#authIntro"), authHelper: $("#authHelper"),
  quickViewModal: $("#quickViewModal"), quickViewImage: $("#quickViewImage"), quickViewCategory: $("#quickViewCategory"), quickViewTitle: $("#quickViewTitle"), quickViewDescription: $("#quickViewDescription"), quickViewPrice: $("#quickViewPrice"), quickViewAdd: $("#quickViewAdd"),
  qrModal: $("#qrModal"), qrCard: $("#qrModal .qr-card"), qrOrderNumber: $("#qrOrderNumber"), qrTotal: $("#qrTotal"), qrContent: $("#qrContent"), qrImage: $("#qrImage"), qrState: $("#qrState"), qrStateMessage: $("#qrStateMessage"), paymentInstruction: $("#paymentInstruction"), autoTransferNotice: $("#autoTransferNotice"), autoTransferNoticeTitle: $("#autoTransferNoticeTitle"), autoTransferNoticeText: $("#autoTransferNoticeText"), zalopayScanGuide: $("#zalopayScanGuide"), zalopayCopyActions: $("#zalopayCopyActions"), copyZaloPayTransferContent: $("#copyZaloPayTransferContent"), copyZaloPayAccountNumber: $("#copyZaloPayAccountNumber"), zaloConfirmation: $("#zaloConfirmation"), zaloConfirmationText: $("#zaloConfirmationText"), zaloConfirmLink: $("#zaloConfirmLink"), copyZaloMessage: $("#copyZaloMessage"), toastRegion: $("#toastRegion"), shopsGrid: $("#shopsGrid"), carrierSection: $("#shipping-partners"), carrierGrid: $("#carrierStorefrontGrid"), faqList: $("#faqList"), saleHuntGrid: $("#saleHuntGrid"), pageLoader: $("#pageLoader"),
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  initializeLocale();
  bindEvents();
  resetQRPreview();
  renderLoadingCards();
  updateCartUI();
  startCountdown();
  try {
    await Promise.all([loadProducts(), loadMarketplaceCMS()]);
    trackAffiliateLanding();
    await restoreSession();
  } finally {
    setPageLoading(false);
  }
}

function setPageLoading(isLoading) {
  setLoadingSurface(els.pageLoader, isLoading);
  document.body.classList.toggle("page-loading", Boolean(isLoading));
}

function bindEvents() {
  mountSaleCart();
  els.headerSearch.addEventListener("submit", handleSearchSubmit);
  els.mobileSearchForm.addEventListener("submit", handleSearchSubmit);
  [els.searchInput, els.mobileSearchInput].forEach((input) => input.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    const otherInput = event.target === els.searchInput ? els.mobileSearchInput : els.searchInput;
    otherInput.value = event.target.value;
    scheduleSearchRender();
  }));

  els.mobileSearchButton.addEventListener("click", () => {
    const isOpen = els.mobileSearchForm.classList.toggle("open");
    closeMobileNav();
    if (isOpen) els.mobileSearchInput.focus();
  });
  els.mobileMenuButton.addEventListener("click", toggleMobileNav);
  els.mobileNavScrim.addEventListener("click", () => closeMobileNav({ restoreFocus: true }));
  els.mobileAccountButton.addEventListener("click", openAccountSurface);
  els.languageToggle.addEventListener("click", toggleLocale);
  els.catalogRetryButton.addEventListener("click", retryCatalog);
  $$("#mobileNav a").forEach((link) => link.addEventListener("click", () => {
    closeMobileNav();
  }));

  $$("input[name='category']").forEach((input) => input.addEventListener("change", (event) => {
    state.filters.category = event.target.value; renderProducts();
  }));
  els.priceRange.addEventListener("input", (event) => {
    state.filters.maxPrice = Number(event.target.value); els.priceOutput.textContent = formatCurrency(state.filters.maxPrice); renderProducts();
  });
  els.saleOnly.addEventListener("change", (event) => { state.filters.saleOnly = event.target.checked; renderProducts(); });
  els.clearFilters.addEventListener("click", resetFilters); els.emptyReset.addEventListener("click", resetFilters);
  $$('[data-category-jump]').forEach((button) => button.addEventListener("click", () => setCategoryFilter(button.dataset.categoryJump)));

  els.productsGrid.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const product = getProductById(actionButton.dataset.productId);
    if (!product) return;
    if (actionButton.dataset.action === "add") addToCart(product);
    if (actionButton.dataset.action === "quick-view") openQuickView(product);
    if (actionButton.dataset.action === COMMENT_ACTION) openProductComment(product);
    if (actionButton.dataset.action === "share") shareProduct(product);
  });

  els.cartButton.addEventListener("click", openCart);
  els.cartItems.addEventListener("click", handleCartActions);
  els.checkoutButton.addEventListener("click", checkout);
  els.overlay.addEventListener("click", closeCart);
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => closeSurface(button.dataset.close)));

  els.authButton.addEventListener("click", openAccountSurface);
  $$("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.quickViewAdd.addEventListener("click", () => { if (state.activeProduct) addToCart(state.activeProduct); });
  els.quickViewImage.addEventListener("click", selectQuickViewImage);
  $$("[data-payment-method]").forEach((button) => button.addEventListener("click", () => setPaymentMethod(button.dataset.paymentMethod)));
  els.qrImage.addEventListener("error", () => {
    if (state.lastOrder) showQRState("Không tải được QR. Hãy kiểm tra Internet và thông tin nhận tiền trong app.js.");
  });
  els.qrImage.addEventListener("load", hideQRState);
  els.zaloConfirmLink.addEventListener("click", markZaloConfirmationRequested);
  els.copyZaloMessage.addEventListener("click", copyZaloMessage);
  els.copyZaloPayTransferContent.addEventListener("click", copyZaloPayTransferContent);
  els.copyZaloPayAccountNumber.addEventListener("click", copyZaloPayAccountNumber);
  els.saleHuntGrid.addEventListener("click", (event) => { const button = event.target.closest("[data-sale-code]"); if (!button) return; applySaleCode(button.dataset.saleCode, true); openCart(); });
  window.addEventListener("nexora:advanced-filter", (event) => { state.filters.technical = event.detail || {}; renderProducts(); });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); els.searchInput.focus(); }
    if (event.key === "Escape") { closeMobileNav({ restoreFocus: true }); els.mobileSearchForm.classList.remove("open"); closeCart(); ["auth", "quick-view", "qr"].forEach(closeModal); }
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 720) closeMobileNav(); });
}

let mobileNavCloseTimer;
function toggleMobileNav() { setMobileNavOpen(!els.mobileNav.classList.contains("open")); }
function setMobileNavOpen(isOpen, { restoreFocus = false } = {}) {
  window.clearTimeout(mobileNavCloseTimer);
  const wasOpen = els.mobileNav.classList.contains("open");
  if (isOpen) {
    els.mobileNav.hidden = false;
    els.mobileNav.classList.add("open");
  } else {
    els.mobileNav.classList.remove("open");
    mobileNavCloseTimer = window.setTimeout(() => { if (!els.mobileNav.classList.contains("open")) els.mobileNav.hidden = true; }, 190);
  }
  els.mobileNavScrim.classList.toggle("open", isOpen);
  els.mobileNav.setAttribute("aria-hidden", String(!isOpen));
  els.mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  els.mobileMenuButton.setAttribute("aria-label", isOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng");
  document.body.classList.toggle("mobile-nav-open", isOpen);
  els.mobileSearchForm.classList.remove("open");
  if (isOpen) requestAnimationFrame(() => $("a", els.mobileNav)?.focus());
  if (restoreFocus && wasOpen && !isOpen) els.mobileMenuButton.focus();
}
function closeMobileNav(options = {}) { setMobileNavOpen(false, options); }
function openAccountSurface() { closeMobileNav(); if (state.user) window.dispatchEvent(new CustomEvent("nexora:account-open")); else openModal("auth"); }
function initializeLocale() { const requestedLocale = new URLSearchParams(window.location.search).get("lang"); try { state.locale = requestedLocale === "en" || requestedLocale === "vi" ? requestedLocale : localStorage.getItem("nexora-locale") === "en" ? "en" : "vi"; } catch { state.locale = requestedLocale === "en" ? "en" : "vi"; } applyLocale(); }
function toggleLocale() { state.locale = state.locale === "vi" ? "en" : "vi"; try { localStorage.setItem("nexora-locale", state.locale); } catch {} applyLocale({ rerender: true }); }
function t(key, fallback = "") { return UI_TRANSLATIONS[state.locale][key] ?? fallback; }
function applyLocale({ rerender = false } = {}) {
  const copy = UI_TRANSLATIONS[state.locale];
  document.documentElement.lang = state.locale;
  document.querySelectorAll("[data-i18n]").forEach((item) => {
    const value = item.dataset.i18n === "securePayment" ? state.locale === "en" ? "Secure checkout via VietQR, MoMo or ZaloPay." : "Thanh toán an toàn qua VietQR, MoMo hoặc ZaloPay." : copy[item.dataset.i18n];
    const hasInteractiveDescendant = Boolean(item.querySelector("input, textarea, select"));
    if (typeof value === "string" && canReplaceTranslationText(hasInteractiveDescendant)) item.textContent = value;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((item) => { const value = copy[item.dataset.i18nHtml]; if (typeof value === "string") item.innerHTML = value; });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((item) => { const value = copy[item.dataset.i18nPlaceholder]; if (typeof value === "string") item.placeholder = value; });
  els.languageToggle.textContent = state.locale === "vi" ? "EN" : "VI";
  els.languageToggle.setAttribute("aria-pressed", String(state.locale === "en"));
  els.languageToggle.setAttribute("aria-label", state.locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt");
  if (rerender) { applySettings(); $("#saleCodeInput")?.closest(".cart-sale-box")?.remove(); mountSaleCart(); setCurrentUser(state.user); setAuthMode(state.authMode); renderProducts(); renderSaleHunt(); renderShops(); renderFAQs(); updateCartUI(); }
}

async function loadProducts() {
  if (!db) {
    state.products = LOCAL_DEMO_PRODUCTS;
    state.catalogLoadError = null;
    renderProducts();
    openSharedProductFromUrl();
    return;
  }
  const [productsResult, imagesResult] = await Promise.all([db.from("products").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false }), db.from("product_images").select("product_id,image_url,sort_order").order("sort_order")]);
  if (productsResult.error) {
    console.error("Không thể tải sản phẩm:", productsResult.error);
    state.products = LOCAL_DEMO_PRODUCTS;
    state.catalogLoadError = "Đang hiển thị dữ liệu dự phòng để bạn tiếp tục xem sản phẩm.";
    showToast("Không tải được catalog từ Supabase. Bạn có thể thử lại khi mạng ổn định.", "error");
  } else {
    const galleryByProduct = new Map();
    (imagesResult.data || []).forEach((image) => { const current = galleryByProduct.get(image.product_id) || []; current.push(image); galleryByProduct.set(image.product_id, current); });
    state.products = (productsResult.data || []).map((product) => ({ ...product, product_images: galleryByProduct.get(product.id) || [] }));
    state.catalogLoadError = null;
  }
  renderProducts();
  openSharedProductFromUrl();
}

async function loadMarketplaceCMS() {
  if (db) {
    const [settingsResult, faqsResult, shopsResult, saleResult, carriersResult] = await Promise.all([db.from("site_settings").select("*").eq("singleton", true).maybeSingle(), db.from("faqs").select("*").eq("is_published", true).order("sort_order"), db.from("shops").select("*").eq("is_active", true).order("created_at"), db.from("sale_campaigns").select("*").eq("is_hunt_featured", true).order("created_at", { ascending: false }), db.from("shipping_carriers").select("name,logo_url,note,tracking_url_template").eq("is_active", true).order("name")]);
    if (settingsResult.data) state.settings = { ...DEFAULT_SETTINGS, ...settingsResult.data }; if (faqsResult.data?.length) state.faqs = faqsResult.data; if (shopsResult.data?.length) state.shops = shopsResult.data; if (saleResult.data?.length) state.saleCampaigns = saleResult.data; state.carriers = carriersResult.data || [];
  }
  applySettings(); renderFAQs(); renderShops(); renderCarriers(); renderSaleHunt(); updateCartUI();
}
function localizedSettings(source) { if (state.locale !== "en") return source; return { ...source, announcement_text: source.announcement_text_en || ENGLISH_SETTING_FALLBACKS.announcement_text, site_tagline: source.site_tagline_en || ENGLISH_SETTING_FALLBACKS.site_tagline, hero_kicker: source.hero_kicker_en || ENGLISH_SETTING_FALLBACKS.hero_kicker, hero_title: source.hero_title_en || ENGLISH_SETTING_FALLBACKS.hero_title, hero_emphasis: source.hero_emphasis_en || ENGLISH_SETTING_FALLBACKS.hero_emphasis, hero_description: source.hero_description_en || ENGLISH_SETTING_FALLBACKS.hero_description, seo_title: source.seo_title_en || ENGLISH_SETTING_FALLBACKS.seo_title, seo_description: source.seo_description_en || ENGLISH_SETTING_FALLBACKS.seo_description }; }
function applySettings() { const s = localizedSettings(state.settings); const title = s.seo_title || `${s.site_name} Tech Store | ${s.hero_title}`; const description = s.seo_description || s.hero_description; const ogImage = s.seo_og_image_url || s.hero_image_url || s.logo_url; document.title = title; document.querySelector("meta[name='description']")?.setAttribute("content", description); document.querySelector("meta[property='og:title']")?.setAttribute("content", title); document.querySelector("meta[property='og:description']")?.setAttribute("content", description); if (ogImage) document.querySelector("meta[property='og:image']")?.setAttribute("content", ogImage); $("#announcementText").textContent = s.announcement_text; $("#heroKicker").textContent = s.hero_kicker; $("#heroTitlePlain").textContent = s.hero_title; $("#heroTitleEmphasis").textContent = s.hero_emphasis; $("#heroDescription").textContent = s.hero_description; $("#footerTagline").innerHTML = escapeHtml(s.site_tagline).replace(/\n/g, "<br />"); $("#footerSupportEmail").textContent = s.support_email; $("#footerSupportEmail").href = `mailto:${s.support_email}`; $("#footerSupportHours").textContent = s.support_hours; $("#footerAddress").textContent = s.address_text; if (s.hero_image_url) $("#heroImage").src = s.hero_image_url; if (s.favicon_url) { const favicon = document.querySelector("link[rel='icon']"); if (favicon) favicon.href = s.favicon_url; } PAYMENT_CONFIG = { bankId: s.payment_bank_id || PAYMENT_CONFIG.bankId, accountNumber: s.payment_account_number || PAYMENT_CONFIG.accountNumber, accountName: s.payment_account_name || PAYMENT_CONFIG.accountName, momoPhone: s.payment_momo_phone || PAYMENT_CONFIG.momoPhone }; $$("[data-site-logo]").forEach((img) => { if (s.logo_url) img.src = s.logo_url; }); $$("[data-site-name]").forEach((item) => item.textContent = s.site_name); renderFooterContacts(s); renderFooterSellerContact(s); renderZaloConfirmation(); window.dispatchEvent(new CustomEvent("nexora:settings", { detail: s })); }
function renderFAQs() { els.faqList.innerHTML = state.faqs.map((faq, index) => { const legacy = LEGACY_FAQ_EN.get(faq.question) || {}; const question = state.locale === "en" ? faq.question_en || legacy.question || faq.question : faq.question; const answer = state.locale === "en" ? faq.answer_en || legacy.answer || faq.answer : faq.answer; return `<details class="faq-item" ${index === 0 ? "open" : ""}><summary><span>${escapeHtml(question)}</span><i class="fa-solid fa-plus" aria-hidden="true"></i></summary><p>${escapeHtml(answer)}</p></details>`; }).join(""); }
function renderShops() {
  els.shopsGrid.innerHTML = state.shops.map((shop) => {
    const zalo = normalizeZaloPhone(shop.zalo_phone);
    const contact = zalo ? `<a class="shop-zalo" href="https://zalo.me/${zalo}" target="_blank" rel="noopener"><i class="fa-solid fa-comment-dots" aria-hidden="true"></i>${escapeHtml(shop.zalo_label || t("contactSupport"))}</a>` : `<a href="mailto:${escapeHtml(shop.contact_email || state.settings.support_email)}">${t("contactSupport")} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`;
    return `<article class="shop-card ${shop.banner_url ? "" : "no-banner"}"><div class="shop-card-image">${shop.banner_url ? `<img src="${escapeHtml(shop.banner_url)}" alt="" loading="lazy" decoding="async" width="720" height="420" sizes="(max-width: 720px) 100vw, 33vw" />` : ""}<span>${escapeHtml(shop.category)}</span></div><div class="shop-card-body"><div class="shop-card-title"><h3>${escapeHtml(shop.name)}</h3>${shop.is_verified ? `<i class="fa-solid fa-circle-check" aria-label="${escapeHtml(t("verified"))}"></i>` : ""}</div><div class="shop-card-meta"><span><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>${shop.is_verified ? t("verified") : t("updating")}</span><span>${escapeHtml(shop.slug || "SHOP")}</span></div><p>${escapeHtml(shop.description)}</p><div class="shop-actions">${contact}<a href="/info.html?page=seller-guide">${t("standard")} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div></div></article>`;
  }).join("");
}
function renderCarriers() { if (!els.carrierSection || !els.carrierGrid) return; els.carrierSection.hidden = !state.carriers.length; els.carrierGrid.innerHTML = state.carriers.map((carrier) => `<article class="carrier-storefront-card">${carrier.logo_url ? `<img src="${escapeHtml(carrier.logo_url)}" alt="${escapeHtml(carrier.name)}" loading="lazy" decoding="async" width="96" height="96" />` : '<i class="fa-solid fa-truck-fast" aria-hidden="true"></i>'}<div><span>DELIVERY PARTNER</span><h3>${escapeHtml(carrier.name)}</h3><p>${escapeHtml(carrier.note || "Hỗ trợ giao nhận và cập nhật hành trình đơn hàng.")}</p></div></article>`).join(""); }
function renderSaleHunt() { const campaigns = state.saleCampaigns.filter(isCampaignActive); els.saleHuntGrid.innerHTML = campaigns.length ? campaigns.map((campaign) => `<article class="sale-hunt-card"><span class="sale-hunt-code">${escapeHtml(campaign.code)}</span><div><h3>${escapeHtml(campaign.title)}</h3><p>${escapeHtml(campaign.description)}</p></div><button data-sale-code="${escapeHtml(campaign.code)}" type="button">${t("useCode")}</button></article>`).join("") : `<p class="sale-hunt-empty">${t("noActiveSale")}</p>`; }
function renderLoadingCards() {
  setBusyRegion(els.productsGrid, true);
  els.productCount.textContent = UI_TRANSLATIONS[state.locale].catalogLoading;
  els.emptyState.classList.add("hidden");
  els.productsGrid.innerHTML = Array.from({ length: 6 }, () => '<article class="loading-card" aria-hidden="true"><div class="loading-card-media"></div><div class="loading-card-body"><span></span><b></b><i></i><em></em></div></article>').join("");
}

function scheduleSearchRender() {
  window.clearTimeout(state.searchTimer);
  setBusyRegion(els.productsGrid, true);
  els.productCount.textContent = t("searchLoading");
  els.emptyState.classList.add("hidden");
  els.productsGrid.innerHTML = `<div class="catalog-inline-loading"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i><span>${t("searchHint")}</span></div>`;
  state.searchTimer = window.setTimeout(renderProducts, 150);
}

async function retryCatalog() {
  if (!db) return showToast("Catalog hiện đang dùng dữ liệu demo do chưa có kết nối Supabase.", "error");
  els.catalogRetryButton.disabled = true;
  els.catalogRetryButton.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ${t("retry")}`;
  renderLoadingCards();
  await loadProducts();
  els.catalogRetryButton.disabled = false;
  els.catalogRetryButton.textContent = t("retry");
}

function getFilteredProducts() {
  const search = normalizeText(state.filters.search);
  return state.products.filter((product) => {
    const matchesCategory = state.filters.category === "all" || product.category === state.filters.category;
    const matchesPrice = Number(product.price) <= state.filters.maxPrice;
    const matchesSale = !state.filters.saleOnly || Boolean(product.is_sale);
    const searchable = normalizeText(`${product.name} ${product.category} ${product.description}`);
    const specs = product.technical_specs || {};
    const matchesTechnical = Object.entries(state.filters.technical || {}).every(([key, value]) => !value || normalizeText(String(specs[key] || "")).includes(normalizeText(value)));
    return matchesCategory && matchesPrice && matchesSale && matchesTechnical && searchable.includes(search);
  });
}

function renderProducts() {
  const products = getFilteredProducts();
  setBusyRegion(els.productsGrid, false);
  els.catalogRetry.hidden = !state.catalogLoadError;
  els.catalogRetryMessage.textContent = state.catalogLoadError ? t("catalogFallback") : "";
  els.productCount.textContent = UI_TRANSLATIONS[state.locale].devicesShown(products.length);
  els.productsGrid.innerHTML = products.map(createProductCard).join("");
  els.emptyState.classList.toggle("hidden", products.length > 0);
  renderActiveFilters();
}

function createProductCard(product) {
  const discount = calculateDiscount(product);
  const saleBadge = product.is_sale && discount > 0 ? `<span class="sale-badge">-${discount}% SALE</span>` : "";
  const oldPrice = Number(product.original_price) > Number(product.price) ? `<span class="original-price">${formatCurrency(product.original_price)}</span>` : "";
  const purchasable = canPurchaseProduct(product);
  const stockState = Number(product.stock) <= 0 ? `<span class="sales-state out"><i class="fa-solid fa-box-open"></i> ${t("soldOut").toUpperCase()}</span>` : "";
  return `
    <article class="product-card ${purchasable ? "" : "out-of-stock"}">
      <div class="product-image-wrap">
        <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" width="760" height="520" sizes="(max-width: 720px) 50vw, (max-width: 980px) 33vw, 300px" />
        ${saleBadge}
        ${stockState}
        <button class="quick-button" data-action="quick-view" data-product-id="${escapeHtml(product.id)}" type="button" aria-label="Xem nhanh ${escapeHtml(product.name)}"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
      </div>
      <div class="product-content">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="price-row"><strong class="sale-price">${formatCurrency(product.price)}</strong>${oldPrice}</div>${renderProductSpecChips(product)}${renderSellerContactLink(product)}
        <div class="product-actions">
          <button class="button button-primary add-button" data-action="add" data-product-id="${escapeHtml(product.id)}" type="button" ${purchasable ? "" : "disabled"}>${purchasable ? `${t("addCart")} <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>` : t("soldOut")}</button>
          <button class="view-button" data-action="quick-view" data-product-id="${escapeHtml(product.id)}" type="button" aria-label="${t("discover")}"><i class="fa-solid fa-eye" aria-hidden="true"></i></button>
          <button class="share-action" data-action="share" data-product-id="${escapeHtml(product.id)}" type="button" aria-label="Chia sẻ ${escapeHtml(product.name)}"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i></button>
          <button class="comment-action" data-action="comment" data-product-id="${escapeHtml(product.id)}" type="button" aria-label="${t("comments")} ${escapeHtml(product.name)}"><i class="fa-regular fa-comment" aria-hidden="true"></i><span>${t("comments")}</span></button>
        </div>
      </div>
    </article>`;
}

function renderActiveFilters() {
  const chips = [];
  if (state.filters.category !== "all") chips.push(`${t("categoryLabel")}: ${state.filters.category}`);
  if (state.filters.saleOnly) chips.push("SALE");
  if (state.filters.maxPrice < Number(els.priceRange.max)) chips.push(`${state.locale === "en" ? "Up to" : "Tối đa"} ${formatCurrency(state.filters.maxPrice)}`);
  if (state.filters.search) chips.push(`${state.locale === "en" ? "Search" : "Tìm"}: “${escapeHtml(state.filters.search)}”`);
  Object.entries(state.filters.technical || {}).forEach(([key, value]) => { if (value) chips.push(`${({ processor: "CPU", ram: "RAM", storage: "Ổ cứng" })[key] || key}: ${escapeHtml(value)}`); });
  els.activeFilters.innerHTML = chips.map((chip) => `<span class="filter-chip"><i class="fa-solid fa-filter" aria-hidden="true"></i>${chip}</span>`).join("");
}

function resetFilters() {
  state.filters = { category: "all", maxPrice: 35000000, saleOnly: false, search: "", technical: {} };
  window.dispatchEvent(new Event("nexora:advanced-filter-reset"));
  $("input[name='category'][value='all']").checked = true;
  els.priceRange.value = "35000000"; els.priceOutput.textContent = formatCurrency(35000000); els.saleOnly.checked = false;
  els.searchInput.value = ""; els.mobileSearchInput.value = "";
  renderProducts();
}

function setCategoryFilter(category) {
  state.filters.category = category;
  const input = $(`input[name='category'][value='${category}']`); if (input) input.checked = true;
  renderProducts();
  $("#products").scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleSearchSubmit(event) { event.preventDefault(); $("#products").scrollIntoView({ behavior: "smooth", block: "start" }); }

function openQuickView(product) {
  state.activeProduct = product;
  const images = productGalleryUrls(product);
  els.quickViewImage.innerHTML = `<div class="quick-view-gallery"><div class="quick-view-gallery-main"><img id="quickViewMainImage" src="${escapeHtml(images[0] || product.image_url)}" alt="${escapeHtml(product.name)}" />${images.length > 1 ? `<span class="quick-view-gallery-count">1/${images.length}</span>` : ""}</div>${images.length > 1 ? `<div class="quick-view-gallery-thumbs">${images.map((url, index) => `<button type="button" data-gallery-image="${escapeHtml(url)}" class="${index === 0 ? "active" : ""}" aria-label="Xem ảnh ${index + 1} của ${escapeHtml(product.name)}"><img src="${escapeHtml(url)}" alt="" /></button>`).join("")}</div>` : ""}</div>`;
  els.quickViewCategory.textContent = `${product.category.toUpperCase()} / ${product.is_sale ? "SALE ACTIVE" : "STANDARD"}`;
  els.quickViewTitle.textContent = product.name;
  els.quickViewDescription.textContent = product.description;
  els.quickViewPrice.innerHTML = `<strong>${formatCurrency(product.price)}</strong>${Number(product.original_price) > Number(product.price) ? `<del>${formatCurrency(product.original_price)}</del>` : ""}`;
  renderQuickViewSpecs(product);
  renderQuickViewSellerContact(product);
  renderQuickViewCommentAction();
  const purchasable = canPurchaseProduct(product);
  els.quickViewAdd.disabled = !purchasable;
  els.quickViewAdd.innerHTML = purchasable ? `${t("addToCart")} <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>` : t("soldOut");
  openModal("quick-view");
  window.dispatchEvent(new CustomEvent("nexora:quickview", { detail: { product } }));
}
function selectQuickViewImage(event) { const button = event.target.closest("[data-gallery-image]"); if (!button) return; const image = $("#quickViewMainImage"); if (!image) return; image.src = button.dataset.galleryImage; const buttons = $$('[data-gallery-image]', els.quickViewImage); buttons.forEach((item) => item.classList.toggle("active", item === button)); const count = $(".quick-view-gallery-count", els.quickViewImage); if (count) count.textContent = `${buttons.indexOf(button) + 1}/${buttons.length}`; }

function openSharedProductFromUrl() {
  if (state.sharedProductOpened) return;
  const productId = new URLSearchParams(window.location.search).get("product");
  const product = productId ? getProductById(productId) : null;
  if (!product) return;
  state.sharedProductOpened = true;
  openQuickView(product);
}

function trackAffiliateLanding() {
  const params = new URLSearchParams(window.location.search);
  const referralCode = params.get("ref")?.trim().toUpperCase();
  if (!db || !/^[A-Z0-9]{6,18}$/.test(referralCode || "")) return;
  let visitorToken = localStorage.getItem("nexora-affiliate-visitor-token");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorToken || "")) {
    visitorToken = crypto.randomUUID();
    localStorage.setItem("nexora-affiliate-visitor-token", visitorToken);
  }
  const productId = params.get("product");
  const safeProductId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId || "") ? productId : null;
  db.rpc("track_affiliate_link_click", { p_referral_code: referralCode, p_visitor_token: visitorToken, p_product_id: safeProductId }).then(({ error }) => {
    if (error) console.warn("Không thể ghi nhận click affiliate:", error.message);
  });
}

async function shareProduct(product) {
  const url = buildProductShareUrl(window.location.origin, product.id, state.affiliateShareCode);
  const text = buildProductShareText(product.name, formatCurrency(product.price), Boolean(state.affiliateShareCode));
  try {
    if (navigator.share) {
      await navigator.share({ title: product.name, text, url });
      return;
    }
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(url);
    showToast(state.affiliateShareCode ? "Đã sao chép link sản phẩm kèm referral affiliate." : "Đã sao chép link sản phẩm.", "success");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Không thể mở chia sẻ tự động. Hãy thử lại hoặc sao chép URL trình duyệt.", "error");
  }
}

function openProductComment(product) {
  openQuickView(product);
  requestAnimationFrame(focusCommunityComposer);
}

function focusCommunityComposer() {
  const selector = getCommunityFocusTarget(COMMENT_ACTION);
  const input = selector ? $(selector) : null;
  if (!input) return showToast("Khu vực bình luận đang được tải. Hãy thử lại sau giây lát.", "error");
  input.closest(".product-community")?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => input.focus(), 180);
}

function renderQuickViewCommentAction() {
  let button = $("#quickViewCommentAction");
  if (!button) {
    button = document.createElement("button");
    button.id = "quickViewCommentAction";
    button.className = "button quick-view-comment";
    button.type = "button";
    els.quickViewAdd.after(button);
  }
  button.innerHTML = `<i class="fa-regular fa-comment" aria-hidden="true"></i> ${t("comments")}`;
  button.onclick = focusCommunityComposer;
}

function safelyReadCart() {
  try { const saved = JSON.parse(localStorage.getItem("nexora-cart") || "[]"); return Array.isArray(saved) ? saved : []; }
  catch { return []; }
}

function persistCart() { localStorage.setItem("nexora-cart", JSON.stringify(state.cart)); }
function getProductById(id) { return state.products.find((product) => String(product.id) === String(id)) || state.cart.find((item) => String(item.id) === String(id)); }

function addToCart(product) {
  if (!canPurchaseProduct(product)) { showToast("Sản phẩm này hiện đã hết hàng hoặc đang ngừng bán.", "error"); return; }
  const existing = state.cart.find((item) => String(item.id) === String(product.id));
  if (existing && existing.quantity >= Number(product.stock)) { showToast("Số lượng trong giỏ đã bằng tồn kho hiện có.", "error"); return; }
  if (existing) existing.quantity += 1;
  else state.cart.push({ ...product, quantity: 1 });
  persistCart(); updateCartUI(); showToast(`${product.name} đã được thêm vào giỏ.`, "success");
}

function handleCartActions(event) {
  const button = event.target.closest("[data-cart-action]"); if (!button) return;
  const productId = button.dataset.productId; const item = state.cart.find((cartItem) => String(cartItem.id) === String(productId)); if (!item) return;
  if (button.dataset.cartAction === "increase") { const current = state.products.find((product) => String(product.id) === String(productId)) || item; if (!canPurchaseProduct(current) || item.quantity >= Number(current.stock)) { showToast("Không thể tăng thêm vì sản phẩm đã hết hàng.", "error"); return; } item.quantity += 1; }
  if (button.dataset.cartAction === "decrease") { item.quantity -= 1; if (item.quantity <= 0) state.cart = state.cart.filter((cartItem) => String(cartItem.id) !== String(productId)); }
  if (button.dataset.cartAction === "remove") state.cart = state.cart.filter((cartItem) => String(cartItem.id) !== String(productId));
  persistCart(); updateCartUI();
}

function updateCartUI() {
  const quantity = state.cart.reduce((sum, item) => sum + Number(item.quantity), 0);
  const pricing = cartPricing(); const total = pricing.total;
  els.cartBadge.textContent = quantity > 99 ? "99+" : quantity; els.cartItemLabel.textContent = `(${quantity})`; els.cartTotal.textContent = formatCurrency(total);
  updateSaleCartUI(pricing);
  els.checkoutButton.disabled = !state.cart.length;
  els.checkoutDelivery.hidden = !state.cart.length;
  els.cartItems.innerHTML = state.cart.length ? state.cart.map((item) => `
    <article class="cart-item">
      <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" />
      <div><h3>${escapeHtml(item.name)}</h3><span class="cart-item-price">${formatCurrency(item.price)}</span>
      <div class="quantity-controls"><button data-cart-action="decrease" data-product-id="${escapeHtml(item.id)}" type="button" aria-label="Giảm số lượng">−</button><span>${item.quantity}</span><button data-cart-action="increase" data-product-id="${escapeHtml(item.id)}" type="button" aria-label="Tăng số lượng">+</button></div></div>
      <button class="remove-item" data-cart-action="remove" data-product-id="${escapeHtml(item.id)}" type="button" aria-label="Xóa ${escapeHtml(item.name)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
    </article>`).join("") : `<div class="cart-empty"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><p>${t("emptyCart")}</p></div>`;
}

function cartSubtotal() { return state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0); }
function cartTotal() { return cartPricing().total; }
function getCampaignByCode(code) { return state.saleCampaigns.find((campaign) => campaign.code === String(code || "").trim().toUpperCase()); }
function isCampaignActive(campaign) { const now = Date.now(); return campaign?.is_active !== false && new Date(campaign.starts_at).getTime() <= now && new Date(campaign.ends_at).getTime() >= now && (!campaign.usage_limit || Number(campaign.usage_count || 0) < Number(campaign.usage_limit)); }
function cartPricing() { const subtotal = cartSubtotal(); const campaign = getCampaignByCode(state.appliedSaleCode); if (!campaign || !isCampaignActive(campaign) || subtotal < Number(campaign.minimum_order_amount || 0)) return { subtotal, discount: 0, total: subtotal, campaign: null }; let discount = campaign.discount_type === "percent" ? Math.floor(subtotal * Number(campaign.discount_value) / 100) : Number(campaign.discount_value); if (campaign.maximum_discount_amount) discount = Math.min(discount, Number(campaign.maximum_discount_amount)); discount = Math.min(discount, subtotal); return { subtotal, discount, total: subtotal - discount, campaign }; }
function mountSaleCart() { const footer = $(".drawer-footer"); if (!footer || $("#saleCodeInput")) return; const module = document.createElement("div"); module.className = "cart-sale-box"; module.innerHTML = `<span class="panel-label">SALE HUNT CODE</span><div class="sale-code-row"><input id="saleCodeInput" maxlength="32" placeholder="${state.locale === "en" ? "ENTER SALE CODE" : "NHẬP MÃ SĂN SALE"}" /><button id="applySaleCode" type="button">${state.locale === "en" ? "Apply" : "Áp dụng"}</button></div><small id="cartSaleFeedback" class="cart-sale-feedback">${state.locale === "en" ? "Enter an active deal code to check savings." : "Nhập mã ưu đãi đang mở để kiểm tra mức giảm."}</small>`; footer.prepend(module); const summary = $(".cart-total", footer); summary.querySelector("span").textContent = state.locale === "en" ? "Total" : "Tổng cộng"; summary.insertAdjacentHTML("beforebegin", `<div class="cart-total"><span>${t("subtotal")}</span><strong id="cartSubtotal">0đ</strong></div><div class="cart-total cart-discount-row" id="cartDiscountRow"><span>${state.locale === "en" ? "Discount" : "Ưu đãi"}</span><strong id="cartDiscount">-0đ</strong></div>`); $("#applySaleCode").addEventListener("click", () => applySaleCode($("#saleCodeInput").value)); $("#saleCodeInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); applySaleCode(event.currentTarget.value); } }); }
function applySaleCode(code, openDrawer = false) { const normalized = String(code || "").trim().toUpperCase(); const campaign = getCampaignByCode(normalized); if (!campaign) { state.appliedSaleCode = ""; updateCartUI(); showToast("Mã săn sale không tồn tại hoặc chưa được mở.", "error"); return; } state.appliedSaleCode = normalized; const pricing = cartPricing(); if (!pricing.campaign) { state.appliedSaleCode = ""; updateCartUI(); showToast(`Đơn cần tối thiểu ${formatCurrency(campaign.minimum_order_amount)} để dùng mã này.`, "error"); return; } updateCartUI(); if (openDrawer) $("#saleCodeInput").value = normalized; showToast(`Đã áp dụng ${campaign.code}: giảm ${formatCurrency(pricing.discount)}.`, "success"); }
function updateSaleCartUI(pricing) { const input = $("#saleCodeInput"); const feedback = $("#cartSaleFeedback"); const subtotal = $("#cartSubtotal"); const discountRow = $("#cartDiscountRow"); const discount = $("#cartDiscount"); if (!input || !feedback || !subtotal || !discountRow || !discount) return; input.value = state.appliedSaleCode; subtotal.textContent = formatCurrency(pricing.subtotal); discount.textContent = `-${formatCurrency(pricing.discount)}`; discountRow.classList.toggle("active", Boolean(pricing.campaign)); feedback.className = `cart-sale-feedback ${pricing.campaign ? "success" : ""}`; feedback.textContent = pricing.campaign ? `${pricing.campaign.badge_text || pricing.campaign.title}: ${state.locale === "en" ? "saved" : "đã giảm"} ${formatCurrency(pricing.discount)}.` : state.locale === "en" ? "Enter an active deal code to check savings." : "Nhập mã ưu đãi đang mở để kiểm tra mức giảm."; }
function canPurchaseProduct(product) { return Boolean(product) && product.is_active !== false && Number(product.stock) > 0; }
function openCart() { els.overlay.hidden = false; els.cartDrawer.classList.add("open"); els.cartDrawer.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll"); }
function closeCart() { els.overlay.hidden = true; els.cartDrawer.classList.remove("open"); els.cartDrawer.setAttribute("aria-hidden", "true"); if (![els.authModal, els.quickViewModal, els.qrModal].some((modal) => !modal.hidden)) document.body.classList.remove("no-scroll"); }

async function restoreSession() {
  if (!db) return;
  const { data } = await db.auth.getSession();
  setCurrentUser(data.session?.user || null);
  const recoveryRequested = isRecoveryCallback(window.location.search);
  if (recoveryRequested && hasRecoveryCallbackError(window.location.search)) showInvalidRecoveryLink();
  else if (recoveryRequested && data.session?.user) openRecoveryForm();
  db.auth.onAuthStateChange((event, session) => {
    setCurrentUser(session?.user || null);
    if (isPasswordRecoveryEvent(event)) openRecoveryForm();
  });
}

function setCurrentUser(user) {
  state.user = user;
  if (user) {
    const label = user.email ? user.email.split("@")[0] : "Tài khoản";
    els.authButton.classList.add("logged-in"); els.authButton.innerHTML = `<i class="fa-solid fa-user-check" aria-hidden="true"></i><span>${escapeHtml(label)}</span>`;
    hydrateCheckoutDelivery(user);
  } else {
    els.authButton.classList.remove("logged-in"); els.authButton.innerHTML = `<i class="fa-regular fa-user" aria-hidden="true"></i><span>${t("login")}</span>`;
  }
}

async function hydrateCheckoutDelivery(user) {
  if (!db || !user?.id) return;
  const [profileResult, affiliateResult] = await Promise.all([
    db.from("customer_profiles").select("delivery_phone,default_shipping_address").eq("user_id", user.id).maybeSingle(),
    db.from("affiliate_profiles").select("referral_code,status").eq("user_id", user.id).maybeSingle(),
  ]);
  if (state.user?.id !== user.id) return;
  const profile = profileResult.data || {};
  if (!els.checkoutCustomerPhone.value) els.checkoutCustomerPhone.value = profile.delivery_phone || "";
  if (!els.checkoutShippingAddress.value) els.checkoutShippingAddress.value = profile.default_shipping_address || "";
  state.affiliateShareCode = affiliateResult.data?.status === "approved" ? affiliateResult.data.referral_code || "" : "";
}

function setAuthMode(mode) {
  state.authMode = mode;
  const signup = mode === "signup";
  const forgotten = mode === "forgot";
  const recovery = mode === "recovery";
  $$("[data-auth-mode]").forEach((button) => { const active = button.dataset.authMode === mode; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
  const en = state.locale === "en";
  els.authEmailField.hidden = recovery;
  els.authEmail.required = !recovery;
  els.authPasswordField.hidden = forgotten;
  els.authPasswordConfirmField.hidden = !recovery;
  els.authUsernameField.hidden = !signup;
  els.authUsername.required = signup;
  els.authDeliveryFields.hidden = !signup;
  els.authDeliveryPhone.required = signup;
  els.authDeliveryAddress.required = signup;
  els.authPassword.required = !forgotten;
  els.authPassword.minLength = recovery ? 8 : 6;
  els.authPasswordConfirm.required = recovery;
  if (forgotten) { els.authPassword.value = ""; els.authPasswordConfirm.value = ""; }
  els.authTitle.innerHTML = recovery ? (en ? "Choose a new<br /><em>secure password.</em>" : "Đặt mật khẩu<br /><em>mới an toàn.</em>") : forgotten ? (en ? "Reset your<br /><em>password safely.</em>" : "Khôi phục<br /><em>mật khẩu an toàn.</em>") : signup ? (en ? "Create an account to<br /><em>keep every step.</em>" : "Tạo tài khoản để<br /><em>lưu trọn hành trình.</em>") : t("authHeading");
  els.authIntro.textContent = recovery ? (en ? "Set a new password for the recovery session opened from your email link." : "Đặt mật khẩu mới cho phiên khôi phục được mở từ link trong email của bạn.") : forgotten ? (en ? "Enter your account email and we will send a secure password reset link." : "Nhập email tài khoản để nhận link đặt lại mật khẩu an toàn.") : signup ? (en ? "Choose a username, then add your delivery phone and address. You can update delivery details later in Account." : "Chọn username, sau đó nhập số điện thoại và địa chỉ nhận hàng. Bạn có thể cập nhật thông tin giao nhận sau trong Tài khoản.") : t("authIntro");
  els.authSubmit.innerHTML = `${recovery ? (en ? "Update password" : "Cập nhật mật khẩu") : forgotten ? (en ? "Send reset link" : "Gửi link đặt lại") : signup ? (en ? "Create account" : "Tạo tài khoản") : t("login")} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
  els.authHelper.innerHTML = recovery ? (en ? 'This link is valid for one recovery session. <button data-auth-mode="login" type="button">Back to sign in</button>.' : 'Link này chỉ dùng cho một phiên khôi phục. <button data-auth-mode="login" type="button">Quay về đăng nhập</button>.') : forgotten ? (en ? 'Remember it? <button data-auth-mode="login" type="button">Sign in</button>.' : 'Đã nhớ mật khẩu? <button data-auth-mode="login" type="button">Đăng nhập</button>.') : signup ? (en ? 'Already have an account? <button data-auth-mode="login" type="button">Sign in</button>.' : 'Đã có tài khoản? <button data-auth-mode="login" type="button">Đăng nhập</button>.') : (en ? 'Forgot your password? <button data-auth-mode="forgot" type="button">Send a reset link</button> · New here? <button data-auth-mode="signup" type="button">Create account</button>.' : 'Quên mật khẩu? <button data-auth-mode="forgot" type="button">Gửi link đặt lại</button> · Chưa có tài khoản? <button data-auth-mode="signup" type="button">Đăng ký</button>.');
  $$("[data-auth-mode]", els.authHelper).forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  els.authPassword.autocomplete = signup || recovery ? "new-password" : "current-password";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!db) { showToast("Hãy điền SUPABASE_URL và SUPABASE_ANON_KEY trong app.js trước khi dùng đăng nhập.", "error"); return; }
  const email = els.authEmail.value.trim(); const password = els.authPassword.value; const recovery = state.authMode === "recovery";
  if ((!recovery && !email) || (state.authMode !== "forgot" && password.length < (recovery ? 8 : 6))) { showToast(state.authMode === "forgot" ? "Vui lòng nhập email hợp lệ." : recovery ? "Mật khẩu mới cần ít nhất 8 ký tự." : "Vui lòng nhập email hợp lệ và mật khẩu từ 6 ký tự.", "error"); return; }
  if (recovery && password !== els.authPasswordConfirm.value) { showToast("Hai mật khẩu mới chưa khớp.", "error"); return; }
  const signupUsername = state.authMode === "signup" ? normalizeSignupUsername(els.authUsername.value) : null;
  if (signupUsername && !signupUsername.valid) { showToast(signupUsername.message, "error"); els.authUsername.focus(); return; }
  const deliveryProfile = state.authMode === "signup" ? normalizeDeliveryProfile({ phone: els.authDeliveryPhone.value, address: els.authDeliveryAddress.value }) : null;
  if (deliveryProfile && !deliveryProfile.valid) { showToast(deliveryProfile.message, "error"); (deliveryProfile.field === "address" ? els.authDeliveryAddress : els.authDeliveryPhone).focus(); return; }
  const redirectTo = getAuthRedirectUrl(state.settings?.public_site_url, "/?recovery=1");
  setButtonLoading(els.authSubmit, true, recovery ? "Đang cập nhật" : state.authMode === "forgot" ? "Đang gửi liên kết" : state.authMode === "signup" ? "Đang tạo tài khoản" : "Đang đăng nhập");
  const result = recovery ? await db.auth.updateUser({ password }) : state.authMode === "forgot" ? await db.auth.resetPasswordForEmail(email, { redirectTo }) : state.authMode === "signup" ? await db.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, data: { username: signupUsername.username, delivery_phone: deliveryProfile.phone, default_shipping_address: deliveryProfile.address } } }) : await db.auth.signInWithPassword({ email, password });
  setButtonLoading(els.authSubmit, false);
  if (result.error) { showToast(result.error.message, "error"); return; }
  if (recovery) { clearRecoveryUrl(); els.authForm.reset(); setAuthMode("login"); closeModal("auth"); showToast("Đã cập nhật mật khẩu. Bạn có thể tiếp tục đăng nhập an toàn.", "success"); return; }
  if (state.authMode === "forgot") { showToast("Nếu email tồn tại, NEXORA đã gửi liên kết đặt lại mật khẩu về domain production.", "success"); setAuthMode("login"); return; }
  if (state.authMode === "signup" && !result.data.session) showToast("Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận rồi đăng nhập.", "success");
  else { showToast(state.authMode === "signup" ? "Tạo tài khoản thành công." : "Đăng nhập thành công.", "success"); closeModal("auth"); }
}

function openRecoveryForm() { setAuthMode("recovery"); openModal("auth"); }
function showInvalidRecoveryLink() { clearRecoveryUrl(); setAuthMode("forgot"); openModal("auth"); showToast("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy nhập email để nhận link mới.", "error"); }
function clearRecoveryUrl() { window.history.replaceState({}, document.title, `${window.location.pathname}${stripRecoveryParameters(window.location.search)}`); }

async function signOut() {
  if (!db) return;
  const { error } = await db.auth.signOut();
  if (error) showToast(error.message, "error"); else showToast("Bạn đã đăng xuất khỏi NEXORA.", "success");
}

async function checkout() {
  if (!state.cart.length) return;
  if (!state.user) { closeCart(); openModal("auth"); showToast("Vui lòng đăng nhập để tiếp tục thanh toán.", "error"); return; }
  if (!db) { showToast("Để tạo đơn hàng, hãy kết nối Supabase trong app.js.", "error"); return; }
  if (state.cart.some((item) => String(item.id).startsWith("demo-"))) { showToast("Catalog mẫu chỉ để xem giao diện. Hãy chạy supabase-schema.sql và kết nối Supabase để thanh toán.", "error"); return; }
  const delivery = getCheckoutDelivery({ customerName: els.checkoutCustomerName.value, customerPhone: els.checkoutCustomerPhone.value, shippingAddress: els.checkoutShippingAddress.value });
  if (!delivery.valid) { showToast(delivery.message, "error"); (delivery.field === "address" ? els.checkoutShippingAddress : els.checkoutCustomerPhone).focus(); return; }
  setButtonLoading(els.checkoutButton, true, "Đang tạo đơn hàng");
  const pricing = cartPricing(); const total = pricing.total; const orderNumber = createOrderNumber();
  const items = state.cart.map((item) => ({ product_id: item.id, quantity: Number(item.quantity) }));
  const { data: order, error: orderError } = await db.rpc("create_order_with_delivery", {
    p_order_number: orderNumber,
    p_payment_method: "vietqr",
    p_payment_note: "Đơn được tạo từ NEXORA Tech Store",
    p_sale_code: state.appliedSaleCode || null,
    p_items: items,
    p_customer_name: delivery.name || null,
    p_customer_phone: delivery.phone || null,
    p_shipping_address: delivery.address,
  });
  setButtonLoading(els.checkoutButton, false);
  if (orderError) { showToast(`Không thể tạo đơn hàng: ${orderError.message}`, "error"); return; }
  state.lastOrder = { id: order.id, number: order.order_number, total: Number(order.total_amount), subtotal: Number(order.subtotal_amount), discount: Number(order.discount_amount || 0), saleCode: order.sale_code || "" };
  state.cart = []; state.appliedSaleCode = ""; els.checkoutCustomerName.value = ""; persistCart(); updateCartUI(); closeCart(); openPaymentModal(); showToast("Đã tạo đơn hàng. Vui lòng quét QR để thanh toán.", "success");
}

function openPaymentModal() { state.activePaymentMethod = "vietqr"; updatePaymentQR(); openModal("qr"); }
async function setPaymentMethod(method) {
  if (method === "wallet") {
    if (!db || !state.user || !state.lastOrder) return;
    const previousMethod = state.activePaymentMethod;
    state.activePaymentMethod = "wallet"; updatePaymentQR();
    const { data, error } = await db.rpc("pay_order_with_wallet", { p_order_id: state.lastOrder.id });
    if (error) { state.activePaymentMethod = previousMethod; updatePaymentQR(); showToast(error.message, "error"); return; }
    const ordersUrl = getWalletPaymentOrdersUrl(data);
    if (!ordersUrl) { state.activePaymentMethod = previousMethod; updatePaymentQR(); showToast("Không thể xác minh trạng thái thanh toán ví. Đơn vẫn chưa được chuyển trang.", "error"); return; }
    window.location.assign(ordersUrl);
    return;
  }
  if (method === "auto_transfer") {
    const presentation = getAutoTransferPresentation(state.settings);
    if (!presentation.ready) return showToast("CK tự động chưa được shop bật hoặc chưa có đủ thông tin nhận tiền.", "error");
    if (!db || !state.user || !state.lastOrder) return;
    const previousMethod = state.activePaymentMethod;
    state.activePaymentMethod = method; updatePaymentQR();
    const { data, error } = await db.rpc("select_auto_transfer_payment", { p_order_id: state.lastOrder.id });
    if (error) { state.activePaymentMethod = previousMethod; updatePaymentQR(); showToast(error.message, "error"); return; }
    state.lastOrder = { ...state.lastOrder, provider: data.auto_transfer_provider || presentation.provider };
    watchAutoTransferOrder();
    return;
  }
  state.activePaymentMethod = method;
  updatePaymentQR();
  if (!db || !state.user || !state.lastOrder) return;
  const { error } = await db.from("orders").update({ payment_method: method, auto_transfer_provider: null, auto_transfer_reference: null }).eq("id", state.lastOrder.id).eq("user_id", state.user.id);
  if (error) showToast("Không thể đồng bộ phương thức thanh toán đã chọn.", "error");
}
function updatePaymentQR() {
  if (!state.lastOrder) return;
  const zaloPayQrUrl = state.activePaymentMethod === "zalopay" ? getTrustedZaloPayQrUrl(state.settings?.payment_zalopay_qr_url) : null;
  const presentation = getPaymentPresentation(state.activePaymentMethod, Boolean(zaloPayQrUrl));
  const autoTransfer = getAutoTransferPresentation(state.settings);
  els.qrCard?.classList.toggle("is-zalopay", presentation.isZaloPay);
  if (els.zalopayScanGuide) els.zalopayScanGuide.hidden = !presentation.showZaloPayGuide;
  if (els.autoTransferNotice) els.autoTransferNotice.hidden = state.activePaymentMethod !== "auto_transfer";
  $$("[data-payment-method]").forEach((button) => button.classList.toggle("active", button.dataset.paymentMethod === state.activePaymentMethod));
  const { number, total } = state.lastOrder; const content = encodeURIComponent(number); const transferNote = `${number} thanh toan NEXORA`;
  els.qrOrderNumber.textContent = number; els.qrTotal.textContent = formatCurrency(total); els.qrContent.textContent = number; renderZaloPayCopyActions({ presentation, number }); renderZaloConfirmation();
  els.zaloConfirmation.hidden = state.activePaymentMethod === "auto_transfer";
  if (state.activePaymentMethod === "wallet") {
    els.qrImage.hidden = true; showQRState("Đơn đã được thanh toán bằng số dư NEXORA."); els.qrStateMessage.textContent = "Số dư đã được trừ và giao dịch được ghi vào Account Center."; els.paymentInstruction.textContent = "Bạn có thể xem số dư và sổ cái bằng nút tài khoản trên header."; return;
  }
  if (state.activePaymentMethod === "auto_transfer") {
    if (!autoTransfer.ready) { showQRState("CK tự động chưa sẵn sàng. Vui lòng chọn phương thức khác."); return; }
    els.qrImage.hidden = false;
    els.qrImage.src = `https://img.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNumber}-compact2.png?amount=${total}&addInfo=${content}&accountName=${encodeURIComponent(PAYMENT_CONFIG.accountName)}`;
    els.qrImage.alt = `QR CK tự động thanh toán đơn ${number}`;
    els.paymentInstruction.textContent = `Quét mã bằng ứng dụng ngân hàng và giữ nguyên số tiền cùng nội dung ${number}. Hệ thống sẽ tự đối soát sau khi tiền vào.`;
    els.autoTransferNoticeTitle.textContent = `Tự đối soát qua ${autoTransfer.providerLabel}`;
    els.autoTransferNoticeText.textContent = "Không cần nhắn shop. Đơn chỉ được xác nhận khi webhook đã xác thực, mã đơn và số tiền khớp.";
  } else if (state.activePaymentMethod === "vietqr") {
    if (!isPaymentConfigured("vietqr")) { showQRState("Cần điền mã ngân hàng, số tài khoản và tên người nhận thật trong PAYMENT_CONFIG."); return; }
    els.qrImage.hidden = false;
    els.qrImage.src = `https://img.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNumber}-compact2.png?amount=${total}&addInfo=${content}&accountName=${encodeURIComponent(PAYMENT_CONFIG.accountName)}`;
    els.qrImage.alt = `VietQR thanh toán đơn ${number}`;
    els.paymentInstruction.textContent = `Mở ứng dụng ngân hàng, quét VietQR và kiểm tra nội dung “${transferNote}” trước khi xác nhận.`;
  } else if (state.activePaymentMethod === "zalopay") {
    if (!zaloPayQrUrl) { showQRState("Shop chưa cấu hình ảnh QR ZaloPay HTTPS. Vui lòng chọn phương thức khác hoặc liên hệ shop."); return; }
    els.qrImage.hidden = false;
    els.qrImage.src = zaloPayQrUrl;
    els.qrImage.alt = `QR ZaloPay thanh toán đơn ${number}`;
    els.paymentInstruction.textContent = `Mở ZaloPay, quét mã QR và nhập đúng số tiền ${formatCurrency(total)}. Ghi nội dung ${number}; sau đó nhắn Zalo cho shop để đối soát.`;
  } else {
    if (!isPaymentConfigured("momo")) { showQRState("Cần điền số điện thoại MoMo thật trong PAYMENT_CONFIG."); return; }
    els.qrImage.hidden = false;
    const momoPayload = `MoMo|${PAYMENT_CONFIG.momoPhone}|${total}|${number}`;
    els.qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(momoPayload)}`;
    els.qrImage.alt = `QR MoMo thanh toán đơn ${number}`;
    els.paymentInstruction.textContent = `Mở MoMo, quét mã và kiểm tra đúng số tiền. Nội dung thanh toán: ${number}.`;
  }
}
let autoTransferRealtimeChannel = null;
function watchAutoTransferOrder() {
  if (!db || !state.lastOrder) return;
  if (autoTransferRealtimeChannel) db.removeChannel(autoTransferRealtimeChannel);
  autoTransferRealtimeChannel = db.channel(`nexora-auto-transfer-${state.lastOrder.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${state.lastOrder.id}` }, (payload) => {
    if (payload.new?.status !== "paid") return;
    db.removeChannel(autoTransferRealtimeChannel); autoTransferRealtimeChannel = null;
    showToast("Đã tự đối soát thanh toán. Đơn hàng sẵn sàng được xử lý.", "success");
    window.setTimeout(() => window.location.assign(`/orders.html?paid=auto_transfer&order=${encodeURIComponent(state.lastOrder.number)}`), 850);
  }).subscribe();
}
function isPaymentConfigured(method) {
  if (method === "zalopay") return Boolean(getTrustedZaloPayQrUrl(state.settings?.payment_zalopay_qr_url));
  const values = method === "vietqr" ? [PAYMENT_CONFIG.bankId, PAYMENT_CONFIG.accountNumber, PAYMENT_CONFIG.accountName] : [PAYMENT_CONFIG.momoPhone];
  return values.every((value) => !PLACEHOLDER_PAYMENT_VALUES.has(String(value).trim()));
}
function renderZaloConfirmation() {
  if (!state.lastOrder) return;
  const phone = normalizeZaloPhone(state.settings.zalo_phone); const configured = Boolean(phone);
  const message = String(state.settings.zalo_confirmation_message || DEFAULT_SETTINGS.zalo_confirmation_message).replaceAll("{order_number}", state.lastOrder.number).replaceAll("{total}", formatCurrency(state.lastOrder.total));
  els.zaloConfirmation.dataset.configured = String(configured);
  els.zaloConfirmationText.textContent = configured ? `Đã chuyển khoản? Nhắn Zalo cho shop kèm nội dung: “${message}”` : "Shop chưa cấu hình số Zalo. Vui lòng lưu mã đơn và liên hệ qua email hỗ trợ để xác nhận.";
  els.zaloConfirmLink.href = configured ? `https://zalo.me/${phone}` : "#"; els.zaloConfirmLink.setAttribute("aria-disabled", String(!configured)); els.copyZaloMessage.dataset.message = message;
}
function renderZaloPayCopyActions({ presentation, number }) {
  const actions = getZaloPayCopyActions({
    paymentMethod: state.activePaymentMethod,
    hasReadyQr: presentation.showZaloPayGuide,
    orderNumber: number,
    accountNumber: isPaymentConfigured("vietqr") ? PAYMENT_CONFIG.accountNumber : "",
  });
  els.zalopayCopyActions.hidden = !actions.visible;
  els.copyZaloPayTransferContent.dataset.copyValue = actions.transferContent;
  els.copyZaloPayTransferContent.disabled = !actions.canCopyTransferContent;
  els.copyZaloPayAccountNumber.dataset.copyValue = actions.accountNumber;
  els.copyZaloPayAccountNumber.disabled = !actions.canCopyAccountNumber;
  els.copyZaloPayAccountNumber.setAttribute("aria-label", actions.canCopyAccountNumber ? "Sao chép số tài khoản nhận tiền" : "Shop chưa cấu hình số tài khoản nhận tiền");
}
function normalizeZaloPhone(value) { const digits = String(value || "").replace(/\D/g, ""); if (!digits) return ""; return digits.startsWith("0") ? `84${digits.slice(1)}` : digits; }
function renderFooterContacts(settings) { const container = $("#footerSupportEmail").parentElement; let phoneLink = $("#footerSupportPhone"); let zaloLink = $("#footerZaloLink"); if (!phoneLink) { phoneLink = document.createElement("a"); phoneLink.id = "footerSupportPhone"; $("#footerSupportEmail").after(phoneLink); } if (!zaloLink) { zaloLink = document.createElement("a"); zaloLink.id = "footerZaloLink"; zaloLink.target = "_blank"; zaloLink.rel = "noopener"; phoneLink.after(zaloLink); } const phone = String(settings.support_phone || "").trim(); phoneLink.hidden = !phone; phoneLink.href = phone ? `tel:${phone.replace(/\s/g, "")}` : "#"; phoneLink.textContent = phone ? `Hotline: ${phone}` : ""; const zaloPhone = normalizeZaloPhone(settings.zalo_phone); zaloLink.hidden = !zaloPhone; zaloLink.href = zaloPhone ? `https://zalo.me/${zaloPhone}` : "#"; zaloLink.innerHTML = zaloPhone ? `<i class="fa-solid fa-comment-dots" aria-hidden="true"></i> ${escapeHtml(settings.zalo_label || "Nhắn Zalo với NEXORA")}` : ""; }
function getSellerContact(product) { const phone = normalizeZaloPhone(state.settings.seller_zalo_phone); if (!phone) return null; const label = state.settings.seller_contact_label || "Liên hệ người bán"; const message = (state.settings.seller_contact_message || "Xin chào, tôi muốn tư vấn về sản phẩm {product_name}.").replace("{product_name}", product.name); return { phone, label, message }; }
function renderSellerContactLink(product) { const seller = getSellerContact(product); if (!seller) return ""; return `<a class="seller-contact-link" href="https://zalo.me/${seller.phone}" target="_blank" rel="noopener" title="${escapeHtml(seller.message)}"><i class="fa-solid fa-comment-dots" aria-hidden="true"></i> ${escapeHtml(seller.label)}</a>`; }
function renderQuickViewSellerContact(product) { const seller = getSellerContact(product); let link = $("#quickViewSellerContact"); if (!link) { link = document.createElement("a"); link.id = "quickViewSellerContact"; link.className = "button quick-view-seller"; link.target = "_blank"; link.rel = "noopener"; els.quickViewAdd.after(link); } link.hidden = !seller; if (!seller) return; link.href = `https://zalo.me/${seller.phone}`; link.title = seller.message; link.innerHTML = `<i class="fa-solid fa-comment-dots" aria-hidden="true"></i>${escapeHtml(seller.label)}`; }
function renderFooterSellerContact(settings) { const seller = getSellerContact({ name: "NEXORA" }); let link = $("#footerSellerContact"); if (!link) { link = document.createElement("a"); link.id = "footerSellerContact"; link.className = "footer-seller-link"; link.target = "_blank"; link.rel = "noopener"; $("#footerZaloLink").after(link); } link.hidden = !seller; if (!seller) return; link.href = `https://zalo.me/${seller.phone}`; link.innerHTML = `<i class="fa-solid fa-store" aria-hidden="true"></i> ${escapeHtml(seller.label)}`; }
const PRODUCT_SPEC_LABELS = { processor: "CPU", chipset: "CHIP", ram: "RAM", storage: "LƯU TRỮ", graphics: "GPU", display: "MÀN HÌNH", battery: "PIN", connectivity: "KẾT NỐI", os: "HỆ ĐIỀU HÀNH", ports: "CỔNG", extras: "KHÁC" };
function normalizeProductSpecs(product) { const raw = product?.technical_specs ?? product?.specifications ?? {}; if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } } return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}; }
function specEntries(product) { return Object.entries(normalizeProductSpecs(product)).filter(([key, value]) => PRODUCT_SPEC_LABELS[key] && String(value ?? "").trim()); }
function renderProductSpecChips(product) { const specs = normalizeProductSpecs(product); const priority = ["processor", "chipset", "ram", "storage"]; const items = priority.filter((key) => specs[key]).slice(0, 2); return items.length ? `<div class="product-spec-chips">${items.map((key) => `<span class="product-spec-chip">${PRODUCT_SPEC_LABELS[key]}: ${escapeHtml(specs[key])}</span>`).join("")}</div>` : '<div class="product-spec-chips empty">THÔNG SỐ ĐANG CẬP NHẬT</div>'; }
function renderQuickViewSpecs(product) { const entries = specEntries(product); let panel = $("#quickViewSpecs"); if (!panel) { panel = document.createElement("dl"); panel.id = "quickViewSpecs"; panel.className = "technical-specs"; els.quickViewPrice.after(panel); } panel.hidden = false; panel.innerHTML = entries.length ? `<div class="technical-specs-title">THÔNG SỐ KỸ THUẬT</div>${entries.map(([key, value]) => `<div class="technical-spec"><dt>${escapeHtml(PRODUCT_SPEC_LABELS[key])}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}` : '<div class="technical-specs-empty"><i class="fa-solid fa-microchip" aria-hidden="true"></i>Thông số kỹ thuật đang được cập nhật. Hãy liên hệ người bán để được tư vấn chi tiết.</div>'; }
async function markZaloConfirmationRequested(event) {
  if (!normalizeZaloPhone(state.settings.zalo_phone)) { event.preventDefault(); showToast("Shop chưa cấu hình số Zalo để xác nhận.", "error"); return; }
  if (!db || !state.user || !state.lastOrder) return;
  const { error } = await db.rpc("request_order_payment_confirmation", { p_order_id: state.lastOrder.id });
  if (error) showToast(error.message, "error");
}
async function copyZaloMessage() {
  const message = els.copyZaloMessage.dataset.message || ""; if (!message) return;
  try { await navigator.clipboard.writeText(message); showToast("Đã sao chép nội dung. Hãy dán vào Zalo để nhắn shop.", "success"); }
  catch { showToast("Không thể sao chép tự động. Hãy dùng mã đơn hiển thị trong phần thanh toán.", "error"); }
}
async function copyZaloPayTransferContent() { await copyPaymentValue(els.copyZaloPayTransferContent, "Đã sao chép nội dung chuyển khoản.", "Chưa có nội dung chuyển khoản để sao chép."); }
async function copyZaloPayAccountNumber() { await copyPaymentValue(els.copyZaloPayAccountNumber, "Đã sao chép số tài khoản.", "Shop chưa cấu hình số tài khoản nhận tiền."); }
async function copyPaymentValue(button, successMessage, unavailableMessage) {
  const value = button?.dataset.copyValue || "";
  if (!value) { showToast(unavailableMessage, "error"); return; }
  try { await navigator.clipboard.writeText(value); showToast(successMessage, "success"); }
  catch { showToast("Không thể sao chép tự động. Hãy sao chép thông tin hiển thị trong modal.", "error"); }
}
function resetQRPreview() { showQRState("Cần cấu hình phương thức nhận tiền trong app.js."); }
function showQRState(message) { els.qrImage.removeAttribute("src"); els.qrImage.hidden = true; els.qrImage.closest(".qr-image-wrap").classList.add("has-state"); els.qrStateMessage.textContent = message; els.qrState.hidden = false; }
function hideQRState() { els.qrImage.hidden = false; els.qrImage.closest(".qr-image-wrap").classList.remove("has-state"); els.qrState.hidden = true; }

function openModal(name) { const modal = getModal(name); if (!modal) return; modal.hidden = false; document.body.classList.add("no-scroll"); requestAnimationFrame(() => $("button, input", modal)?.focus()); }
function closeModal(name) { const modal = getModal(name); if (!modal) return; modal.hidden = true; if (name === "qr" && autoTransferRealtimeChannel) { db?.removeChannel(autoTransferRealtimeChannel); autoTransferRealtimeChannel = null; } if (!els.cartDrawer.classList.contains("open")) document.body.classList.remove("no-scroll"); }
function closeSurface(name) { if (name === "cart") closeCart(); else closeModal(name); }
function getModal(name) { return { auth: els.authModal, "quick-view": els.quickViewModal, qr: els.qrModal }[name]; }

function startCountdown() {
  const target = Date.now() + (4 * 60 * 60 + 18 * 60 + 46) * 1000;
  const tick = () => { const remaining = Math.max(0, target - Date.now()); const h = Math.floor(remaining / 3600000); const m = Math.floor((remaining % 3600000) / 60000); const s = Math.floor((remaining % 60000) / 1000); $("#countdownHours").textContent = String(h).padStart(2, "0"); $("#countdownMinutes").textContent = String(m).padStart(2, "0"); $("#countdownSeconds").textContent = String(s).padStart(2, "0"); };
  tick(); window.setInterval(tick, 1000);
}

function createOrderNumber() { return `NXR-${String(Date.now()).slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`; }
function calculateDiscount(product) { const original = Number(product.original_price); const price = Number(product.price); return original > price ? Math.round((1 - price / original) * 100) : 0; }
function formatCurrency(value) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function normalizeText(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character])); }
function setButtonLoading(button, isLoading, loadingText = "Đang xử lý") { if (isLoading) { button.dataset.originalHtml = button.innerHTML; button.disabled = true; button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ${loadingText}`; } else { button.disabled = false; button.innerHTML = button.dataset.originalHtml || button.innerHTML; } }
function showToast(message, type = "info") { const icon = type === "error" ? "fa-circle-exclamation" : type === "success" ? "fa-circle-check" : "fa-circle-info"; const toast = document.createElement("div"); toast.className = `toast ${type}`; toast.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`; els.toastRegion.append(toast); window.setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(18px)"; window.setTimeout(() => toast.remove(), 180); }, 3600); }
