/* Circuit Atelier — Vanilla JS storefront logic: Supabase, catalogue, cart and payment signal. */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

// ============================================================================
// 1) SUPABASE CONFIGURATION
// Điền Project URL và anon public key tại supabase-config.js.
// LƯU Ý: Không bao giờ đặt service_role key vào frontend.
// ============================================================================

// Điền thông tin nhận tiền trước khi sử dụng ở môi trường thật.
const PAYMENT_CONFIG = {
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
const DEFAULT_SETTINGS = { site_name: "NEXORA", site_tagline: "Thiết bị đúng chuẩn.\nMức giá đúng thời điểm.", announcement_text: "Freeship toàn quốc cho đơn từ 1.500.000đ", support_email: "support@nexora.vn", support_hours: "Thứ 2 — Thứ 7 / 09:00–18:00", address_text: "Việt Nam", zalo_phone: "", zalo_confirmation_message: "Tôi đã chuyển khoản đơn {order_number} với số tiền {total}. Nhờ shop xác nhận giúp tôi.", logo_url: "/manus-storage/nexora-logo_3c03446b.png", hero_kicker: "CURATED TECH / 2026", hero_title: "Thiết bị đúng chuẩn.", hero_emphasis: "Mức giá đúng thời điểm.", hero_description: "Chọn nhanh những thiết bị công nghệ đáng đầu tư — được phân loại rõ ràng, ưu đãi minh bạch và sẵn sàng giao đến bạn.", hero_image_url: "/manus-storage/nexora-hero-tech_47c6b78f.jpg" };
const DEFAULT_FAQS = [{ question: "Tôi có cần tạo tài khoản để đặt hàng không?", answer: "Bạn có thể xem catalog mà không cần đăng nhập. Để tạo đơn hàng và đồng bộ thanh toán, bạn cần đăng nhập bằng email." }, { question: "Giá sản phẩm có thể thay đổi không?", answer: "Giá và ưu đãi có thể thay đổi khi chương trình kết thúc hoặc tồn kho được cập nhật." }, { question: "Làm thế nào để thanh toán đơn hàng?", answer: "Sau khi tạo đơn, hãy quét VietQR hoặc MoMo và kiểm tra đúng mã đơn, số tiền trước khi xác nhận." }, { question: "Tôi muốn đổi trả hoặc bảo hành thì làm gì?", answer: "Gửi mã đơn, mô tả và hình ảnh liên quan đến kênh hỗ trợ để được hướng dẫn theo chính sách công bố." }];
const DEFAULT_SHOPS = [{ name: "NEXORA Select", category: "Công nghệ tuyển chọn", description: "Thiết bị chính hãng, phụ kiện thiết yếu và các ưu đãi theo mùa.", banner_url: "/manus-storage/nexora-hero-tech_47c6b78f.jpg", is_verified: true }, { name: "Nova Mobile", category: "Điện thoại", description: "Thiết bị di động, phụ kiện bảo vệ và tư vấn lựa chọn theo nhu cầu.", banner_url: "/manus-storage/nexora-phone-category_b50b5ab7.jpg", is_verified: true }, { name: "Orion Compute", category: "Laptop", description: "Laptop và giải pháp làm việc di động cho học tập, sáng tạo và doanh nghiệp nhỏ.", banner_url: "/manus-storage/nexora-laptop-category_9690fafd.jpg", is_verified: true }];

const validSupabaseConfig = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = validSupabaseConfig && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const state = {
  products: [],
  cart: safelyReadCart(),
  user: null,
  authMode: "login",
  activeProduct: null,
  lastOrder: null,
  activePaymentMethod: "vietqr", settings: DEFAULT_SETTINGS, faqs: DEFAULT_FAQS, shops: DEFAULT_SHOPS,
  filters: { category: "all", maxPrice: 35000000, saleOnly: false, search: "" },
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const els = {
  productsGrid: $("#productsGrid"), emptyState: $("#emptyState"), productCount: $("#productCount"), activeFilters: $("#activeFilters"),
  priceRange: $("#priceRange"), priceOutput: $("#priceOutput"), saleOnly: $("#saleOnly"), clearFilters: $("#clearFilters"), emptyReset: $("#emptyReset"),
  searchInput: $("#searchInput"), mobileSearchInput: $("#mobileSearchInput"), headerSearch: $("#headerSearch"), mobileSearchForm: $("#mobileSearchForm"), mobileSearchButton: $("#mobileSearchButton"), mobileMenuButton: $("#mobileMenuButton"), mobileNav: $("#mobileNav"),
  cartButton: $("#cartButton"), cartDrawer: $("#cartDrawer"), cartBadge: $("#cartBadge"), cartItemLabel: $("#cartItemLabel"), cartItems: $("#cartItems"), cartTotal: $("#cartTotal"), checkoutButton: $("#checkoutButton"),
  overlay: $("#overlay"), authButton: $("#authButton"), authModal: $("#authModal"), authForm: $("#authForm"), authEmail: $("#authEmail"), authPassword: $("#authPassword"), authSubmit: $("#authSubmit"), authTitle: $("#authTitle"), authHelper: $("#authHelper"),
  quickViewModal: $("#quickViewModal"), quickViewImage: $("#quickViewImage"), quickViewCategory: $("#quickViewCategory"), quickViewTitle: $("#quickViewTitle"), quickViewDescription: $("#quickViewDescription"), quickViewPrice: $("#quickViewPrice"), quickViewAdd: $("#quickViewAdd"),
  qrModal: $("#qrModal"), qrOrderNumber: $("#qrOrderNumber"), qrTotal: $("#qrTotal"), qrContent: $("#qrContent"), qrImage: $("#qrImage"), qrState: $("#qrState"), qrStateMessage: $("#qrStateMessage"), paymentInstruction: $("#paymentInstruction"), zaloConfirmation: $("#zaloConfirmation"), zaloConfirmationText: $("#zaloConfirmationText"), zaloConfirmLink: $("#zaloConfirmLink"), copyZaloMessage: $("#copyZaloMessage"), toastRegion: $("#toastRegion"), shopsGrid: $("#shopsGrid"), faqList: $("#faqList"),
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  bindEvents();
  resetQRPreview();
  renderLoadingCards();
  updateCartUI();
  startCountdown();
  await Promise.all([loadProducts(), loadMarketplaceCMS()]);
  await restoreSession();
}

function bindEvents() {
  els.headerSearch.addEventListener("submit", handleSearchSubmit);
  els.mobileSearchForm.addEventListener("submit", handleSearchSubmit);
  [els.searchInput, els.mobileSearchInput].forEach((input) => input.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    const otherInput = event.target === els.searchInput ? els.mobileSearchInput : els.searchInput;
    otherInput.value = event.target.value;
    renderProducts();
  }));

  els.mobileSearchButton.addEventListener("click", () => {
    const isOpen = els.mobileSearchForm.classList.toggle("open");
    els.mobileMenuButton.setAttribute("aria-expanded", "false");
    els.mobileNav.classList.remove("open");
    if (isOpen) els.mobileSearchInput.focus();
  });
  els.mobileMenuButton.addEventListener("click", () => {
    const isOpen = els.mobileNav.classList.toggle("open");
    els.mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
    els.mobileSearchForm.classList.remove("open");
  });
  $$("#mobileNav a").forEach((link) => link.addEventListener("click", () => {
    els.mobileNav.classList.remove("open"); els.mobileMenuButton.setAttribute("aria-expanded", "false");
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
  });

  els.cartButton.addEventListener("click", openCart);
  els.cartItems.addEventListener("click", handleCartActions);
  els.checkoutButton.addEventListener("click", checkout);
  els.overlay.addEventListener("click", closeCart);
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => closeSurface(button.dataset.close)));

  els.authButton.addEventListener("click", () => state.user ? signOut() : openModal("auth"));
  $$("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.quickViewAdd.addEventListener("click", () => { if (state.activeProduct) addToCart(state.activeProduct); });
  $$("[data-payment-method]").forEach((button) => button.addEventListener("click", () => setPaymentMethod(button.dataset.paymentMethod)));
  els.qrImage.addEventListener("error", () => {
    if (state.lastOrder) showQRState("Không tải được QR. Hãy kiểm tra Internet và thông tin nhận tiền trong app.js.");
  });
  els.qrImage.addEventListener("load", hideQRState);
  els.zaloConfirmLink.addEventListener("click", markZaloConfirmationRequested);
  els.copyZaloMessage.addEventListener("click", copyZaloMessage);

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); els.searchInput.focus(); }
    if (event.key === "Escape") { closeCart(); ["auth", "quick-view", "qr"].forEach(closeModal); }
  });
}

async function loadProducts() {
  if (!db) {
    state.products = LOCAL_DEMO_PRODUCTS;
    renderProducts();
    return;
  }
  const { data, error } = await db.from("products").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false });
  if (error) {
    console.error("Không thể tải sản phẩm:", error);
    state.products = LOCAL_DEMO_PRODUCTS;
    showToast("Không tải được catalog từ Supabase. Đang hiển thị giao diện mẫu.", "error");
  } else {
    state.products = data || [];
  }
  renderProducts();
}

async function loadMarketplaceCMS() {
  if (db) {
    const [settingsResult, faqsResult, shopsResult] = await Promise.all([db.from("site_settings").select("*").eq("singleton", true).maybeSingle(), db.from("faqs").select("*").eq("is_published", true).order("sort_order"), db.from("shops").select("*").eq("is_active", true).order("created_at")]);
    if (settingsResult.data) state.settings = { ...DEFAULT_SETTINGS, ...settingsResult.data }; if (faqsResult.data?.length) state.faqs = faqsResult.data; if (shopsResult.data?.length) state.shops = shopsResult.data;
  }
  applySettings(); renderFAQs(); renderShops();
}
function applySettings() { const s = state.settings; document.title = `${s.site_name} Tech Store | ${s.hero_title}`; $("#announcementText").textContent = s.announcement_text; $("#heroKicker").textContent = s.hero_kicker; $("#heroTitlePlain").textContent = s.hero_title; $("#heroTitleEmphasis").textContent = s.hero_emphasis; $("#heroDescription").textContent = s.hero_description; $("#footerTagline").innerHTML = escapeHtml(s.site_tagline).replace(/\n/g, "<br />"); $("#footerSupportEmail").textContent = s.support_email; $("#footerSupportEmail").href = `mailto:${s.support_email}`; $("#footerSupportHours").textContent = s.support_hours; $("#footerAddress").textContent = s.address_text; if (s.hero_image_url) $("#heroImage").src = s.hero_image_url; $$("[data-site-logo]").forEach((img) => { if (s.logo_url) img.src = s.logo_url; }); $$("[data-site-name]").forEach((item) => item.textContent = s.site_name); renderZaloConfirmation(); }
function renderFAQs() { els.faqList.innerHTML = state.faqs.map((faq, index) => `<details class="faq-item" ${index === 0 ? "open" : ""}><summary><span>${escapeHtml(faq.question)}</span><i class="fa-solid fa-plus" aria-hidden="true"></i></summary><p>${escapeHtml(faq.answer)}</p></details>`).join(""); }
function renderShops() { els.shopsGrid.innerHTML = state.shops.map((shop) => `<article class="shop-card"><div class="shop-card-image">${shop.banner_url ? `<img src="${escapeHtml(shop.banner_url)}" alt="" loading="lazy" />` : ""}<span>${escapeHtml(shop.category)}</span></div><div class="shop-card-body"><div class="shop-card-title"><h3>${escapeHtml(shop.name)}</h3>${shop.is_verified ? '<i class="fa-solid fa-circle-check" aria-label="Gian hàng đã xác minh"></i>' : ""}</div><p>${escapeHtml(shop.description)}</p><a href="/info.html?page=seller-guide">Khám phá gian hàng <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div></article>`).join(""); }
function renderLoadingCards() {
  els.productsGrid.innerHTML = Array.from({ length: 6 }, () => '<div class="loading-card" aria-label="Đang tải sản phẩm"></div>').join("");
}

function getFilteredProducts() {
  const search = normalizeText(state.filters.search);
  return state.products.filter((product) => {
    const matchesCategory = state.filters.category === "all" || product.category === state.filters.category;
    const matchesPrice = Number(product.price) <= state.filters.maxPrice;
    const matchesSale = !state.filters.saleOnly || Boolean(product.is_sale);
    const searchable = normalizeText(`${product.name} ${product.category} ${product.description}`);
    return matchesCategory && matchesPrice && matchesSale && searchable.includes(search);
  });
}

function renderProducts() {
  const products = getFilteredProducts();
  els.productsGrid.setAttribute("aria-busy", "false");
  els.productCount.textContent = `${products.length.toString().padStart(2, "0")} thiết bị đang hiển thị`;
  els.productsGrid.innerHTML = products.map(createProductCard).join("");
  els.emptyState.classList.toggle("hidden", products.length > 0);
  renderActiveFilters();
}

function createProductCard(product) {
  const discount = calculateDiscount(product);
  const saleBadge = product.is_sale && discount > 0 ? `<span class="sale-badge">-${discount}% SALE</span>` : "";
  const oldPrice = Number(product.original_price) > Number(product.price) ? `<span class="original-price">${formatCurrency(product.original_price)}</span>` : "";
  const purchasable = canPurchaseProduct(product);
  const stockState = Number(product.stock) <= 0 ? '<span class="sales-state out"><i class="fa-solid fa-box-open"></i> HẾT HÀNG</span>' : "";
  return `
    <article class="product-card ${purchasable ? "" : "out-of-stock"}">
      <div class="product-image-wrap">
        <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="eager" fetchpriority="high" />
        ${saleBadge}
        ${stockState}
        <button class="quick-button" data-action="quick-view" data-product-id="${escapeHtml(product.id)}" type="button" aria-label="Xem nhanh ${escapeHtml(product.name)}"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
      </div>
      <div class="product-content">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="price-row"><strong class="sale-price">${formatCurrency(product.price)}</strong>${oldPrice}</div>
        <div class="product-actions">
          <button class="button button-primary add-button" data-action="add" data-product-id="${escapeHtml(product.id)}" type="button" ${purchasable ? "" : "disabled"}>${purchasable ? 'Thêm giỏ <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>' : "Hết hàng"}</button>
          <button class="view-button" data-action="quick-view" data-product-id="${escapeHtml(product.id)}" type="button" aria-label="Xem nhanh"><i class="fa-solid fa-eye" aria-hidden="true"></i></button>
        </div>
      </div>
    </article>`;
}

function renderActiveFilters() {
  const chips = [];
  if (state.filters.category !== "all") chips.push(`Danh mục: ${state.filters.category}`);
  if (state.filters.saleOnly) chips.push("Đang SALE");
  if (state.filters.maxPrice < Number(els.priceRange.max)) chips.push(`Tối đa ${formatCurrency(state.filters.maxPrice)}`);
  if (state.filters.search) chips.push(`Tìm: “${escapeHtml(state.filters.search)}”`);
  els.activeFilters.innerHTML = chips.map((chip) => `<span class="filter-chip"><i class="fa-solid fa-filter" aria-hidden="true"></i>${chip}</span>`).join("");
}

function resetFilters() {
  state.filters = { category: "all", maxPrice: 35000000, saleOnly: false, search: "" };
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
  els.quickViewImage.innerHTML = `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" />`;
  els.quickViewCategory.textContent = `${product.category.toUpperCase()} / ${product.is_sale ? "SALE ACTIVE" : "STANDARD"}`;
  els.quickViewTitle.textContent = product.name;
  els.quickViewDescription.textContent = product.description;
  els.quickViewPrice.innerHTML = `<strong>${formatCurrency(product.price)}</strong>${Number(product.original_price) > Number(product.price) ? `<del>${formatCurrency(product.original_price)}</del>` : ""}`;
  const purchasable = canPurchaseProduct(product);
  els.quickViewAdd.disabled = !purchasable;
  els.quickViewAdd.innerHTML = purchasable ? 'Thêm vào giỏ <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>' : "Hết hàng";
  openModal("quick-view");
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
  const total = cartTotal();
  els.cartBadge.textContent = quantity > 99 ? "99+" : quantity; els.cartItemLabel.textContent = `(${quantity})`; els.cartTotal.textContent = formatCurrency(total);
  els.checkoutButton.disabled = !state.cart.length;
  els.cartItems.innerHTML = state.cart.length ? state.cart.map((item) => `
    <article class="cart-item">
      <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" />
      <div><h3>${escapeHtml(item.name)}</h3><span class="cart-item-price">${formatCurrency(item.price)}</span>
      <div class="quantity-controls"><button data-cart-action="decrease" data-product-id="${escapeHtml(item.id)}" type="button" aria-label="Giảm số lượng">−</button><span>${item.quantity}</span><button data-cart-action="increase" data-product-id="${escapeHtml(item.id)}" type="button" aria-label="Tăng số lượng">+</button></div></div>
      <button class="remove-item" data-cart-action="remove" data-product-id="${escapeHtml(item.id)}" type="button" aria-label="Xóa ${escapeHtml(item.name)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
    </article>`).join("") : `<div class="cart-empty"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><p>Giỏ hàng đang trống. Chọn một thiết bị để bắt đầu phiên mua sắm.</p></div>`;
}

function cartTotal() { return state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0); }
function canPurchaseProduct(product) { return Boolean(product) && product.is_active !== false && Number(product.stock) > 0; }
function openCart() { els.overlay.hidden = false; els.cartDrawer.classList.add("open"); els.cartDrawer.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll"); }
function closeCart() { els.overlay.hidden = true; els.cartDrawer.classList.remove("open"); els.cartDrawer.setAttribute("aria-hidden", "true"); if (![els.authModal, els.quickViewModal, els.qrModal].some((modal) => !modal.hidden)) document.body.classList.remove("no-scroll"); }

async function restoreSession() {
  if (!db) return;
  const { data } = await db.auth.getSession();
  setCurrentUser(data.session?.user || null);
  db.auth.onAuthStateChange((_event, session) => setCurrentUser(session?.user || null));
}

function setCurrentUser(user) {
  state.user = user;
  if (user) {
    const label = user.email ? user.email.split("@")[0] : "Tài khoản";
    els.authButton.classList.add("logged-in"); els.authButton.innerHTML = `<i class="fa-solid fa-user-check" aria-hidden="true"></i><span>${escapeHtml(label)}</span>`;
  } else {
    els.authButton.classList.remove("logged-in"); els.authButton.innerHTML = '<i class="fa-regular fa-user" aria-hidden="true"></i><span>Đăng nhập</span>';
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  const signup = mode === "signup";
  $$("[data-auth-mode]").forEach((button) => { const active = button.dataset.authMode === mode; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
  els.authTitle.innerHTML = signup ? "Tạo tài khoản để<br /><em>lưu trọn hành trình.</em>" : "Đăng nhập để<br /><em>đồng bộ đơn hàng.</em>";
  els.authSubmit.innerHTML = signup ? 'Tạo tài khoản <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>' : 'Đăng nhập <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
  els.authHelper.innerHTML = signup ? 'Đã có tài khoản? <button data-auth-mode="login" type="button">Đăng nhập</button>.' : 'Chưa có tài khoản? Chuyển sang tab <button data-auth-mode="signup" type="button">Đăng ký</button>.';
  $("[data-auth-mode]", els.authHelper).addEventListener("click", () => setAuthMode(signup ? "login" : "signup"));
  els.authPassword.autocomplete = signup ? "new-password" : "current-password";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!db) { showToast("Hãy điền SUPABASE_URL và SUPABASE_ANON_KEY trong app.js trước khi dùng đăng nhập.", "error"); return; }
  const email = els.authEmail.value.trim(); const password = els.authPassword.value;
  if (!email || password.length < 6) { showToast("Vui lòng nhập email hợp lệ và mật khẩu từ 6 ký tự.", "error"); return; }
  setButtonLoading(els.authSubmit, true, state.authMode === "signup" ? "Đang tạo tài khoản" : "Đang đăng nhập");
  const result = state.authMode === "signup" ? await db.auth.signUp({ email, password }) : await db.auth.signInWithPassword({ email, password });
  setButtonLoading(els.authSubmit, false);
  if (result.error) { showToast(result.error.message, "error"); return; }
  if (state.authMode === "signup" && !result.data.session) showToast("Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận rồi đăng nhập.", "success");
  else { showToast(state.authMode === "signup" ? "Tạo tài khoản thành công." : "Đăng nhập thành công.", "success"); closeModal("auth"); }
}

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
  setButtonLoading(els.checkoutButton, true, "Đang tạo đơn hàng");
  const total = cartTotal(); const orderNumber = createOrderNumber();
  const items = state.cart.map((item) => ({ product_id: item.id, quantity: Number(item.quantity) }));
  const { data: order, error: orderError } = await db.rpc("create_order_with_items", {
    p_order_number: orderNumber,
    p_payment_method: "vietqr",
    p_payment_note: "Đơn được tạo từ NEXORA Tech Store",
    p_items: items,
  });
  setButtonLoading(els.checkoutButton, false);
  if (orderError) { showToast(`Không thể tạo đơn hàng: ${orderError.message}`, "error"); return; }
  state.lastOrder = { id: order.id, number: order.order_number, total: Number(order.total_amount) };
  state.cart = []; persistCart(); updateCartUI(); closeCart(); openPaymentModal(); showToast("Đã tạo đơn hàng. Vui lòng quét QR để thanh toán.", "success");
}

function openPaymentModal() { state.activePaymentMethod = "vietqr"; updatePaymentQR(); openModal("qr"); }
async function setPaymentMethod(method) {
  state.activePaymentMethod = method;
  updatePaymentQR();
  if (!db || !state.user || !state.lastOrder) return;
  const { error } = await db.from("orders").update({ payment_method: method }).eq("id", state.lastOrder.id).eq("user_id", state.user.id);
  if (error) showToast("Không thể đồng bộ phương thức thanh toán đã chọn.", "error");
}
function updatePaymentQR() {
  if (!state.lastOrder) return;
  $$("[data-payment-method]").forEach((button) => button.classList.toggle("active", button.dataset.paymentMethod === state.activePaymentMethod));
  const { number, total } = state.lastOrder; const content = encodeURIComponent(number); const transferNote = `${number} thanh toan NEXORA`;
  els.qrOrderNumber.textContent = number; els.qrTotal.textContent = formatCurrency(total); els.qrContent.textContent = number; renderZaloConfirmation();
  if (state.activePaymentMethod === "vietqr") {
    if (!isPaymentConfigured("vietqr")) { showQRState("Cần điền mã ngân hàng, số tài khoản và tên người nhận thật trong PAYMENT_CONFIG."); return; }
    els.qrImage.hidden = false;
    els.qrImage.src = `https://img.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNumber}-compact2.png?amount=${total}&addInfo=${content}&accountName=${encodeURIComponent(PAYMENT_CONFIG.accountName)}`;
    els.qrImage.alt = `VietQR thanh toán đơn ${number}`;
    els.paymentInstruction.textContent = `Mở ứng dụng ngân hàng, quét VietQR và kiểm tra nội dung “${transferNote}” trước khi xác nhận.`;
  } else {
    if (!isPaymentConfigured("momo")) { showQRState("Cần điền số điện thoại MoMo thật trong PAYMENT_CONFIG."); return; }
    els.qrImage.hidden = false;
    const momoPayload = `MoMo|${PAYMENT_CONFIG.momoPhone}|${total}|${number}`;
    els.qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(momoPayload)}`;
    els.qrImage.alt = `QR MoMo thanh toán đơn ${number}`;
    els.paymentInstruction.textContent = `Mở MoMo, quét mã và kiểm tra đúng số tiền. Nội dung thanh toán: ${number}.`;
  }
}
function isPaymentConfigured(method) {
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
function normalizeZaloPhone(value) { const digits = String(value || "").replace(/\D/g, ""); if (!digits) return ""; return digits.startsWith("0") ? `84${digits.slice(1)}` : digits; }
async function markZaloConfirmationRequested(event) {
  if (!normalizeZaloPhone(state.settings.zalo_phone)) { event.preventDefault(); showToast("Shop chưa cấu hình số Zalo để xác nhận.", "error"); return; }
  if (!db || !state.user || !state.lastOrder) return;
  await db.from("orders").update({ zalo_confirmation_requested_at: new Date().toISOString() }).eq("id", state.lastOrder.id).eq("user_id", state.user.id);
}
async function copyZaloMessage() {
  const message = els.copyZaloMessage.dataset.message || ""; if (!message) return;
  try { await navigator.clipboard.writeText(message); showToast("Đã sao chép nội dung. Hãy dán vào Zalo để nhắn shop.", "success"); }
  catch { showToast("Không thể sao chép tự động. Hãy dùng mã đơn hiển thị trong phần thanh toán.", "error"); }
}
function resetQRPreview() { showQRState("Cần cấu hình phương thức nhận tiền trong app.js."); }
function showQRState(message) { els.qrImage.removeAttribute("src"); els.qrImage.hidden = true; els.qrImage.closest(".qr-image-wrap").classList.add("has-state"); els.qrStateMessage.textContent = message; els.qrState.hidden = false; }
function hideQRState() { els.qrImage.hidden = false; els.qrImage.closest(".qr-image-wrap").classList.remove("has-state"); els.qrState.hidden = true; }

function openModal(name) { const modal = getModal(name); if (!modal) return; modal.hidden = false; document.body.classList.add("no-scroll"); requestAnimationFrame(() => $("button, input", modal)?.focus()); }
function closeModal(name) { const modal = getModal(name); if (!modal) return; modal.hidden = true; if (!els.cartDrawer.classList.contains("open")) document.body.classList.remove("no-scroll"); }
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
