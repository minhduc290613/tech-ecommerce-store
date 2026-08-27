export function normalizeProductGallery(primaryUrl, urls = []) {
  const unique = new Set();
  return [primaryUrl, ...urls]
    .map((item) => String(item || "").trim())
    .filter((url) => /^https:\/\//i.test(url))
    .filter((url) => !unique.has(url) && unique.add(url))
    .slice(0, 8);
}

export function productGalleryUrls(product) {
  return normalizeProductGallery(product?.image_url, (product?.product_images || []).map((image) => typeof image === "string" ? image : image.image_url));
}
