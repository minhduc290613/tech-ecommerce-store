export const ROLE_CAPABILITIES = {
  customer: { commandDeck: false, articles: false, moderation: false, orders: false, roles: false, siteSettings: false },
  affiliate: { commandDeck: false, articles: true, moderation: false, orders: false, roles: false, siteSettings: false },
  marketing: { commandDeck: true, articles: true, moderation: false, orders: false, roles: false, siteSettings: false },
  order_manager: { commandDeck: true, articles: false, moderation: false, orders: true, roles: false, siteSettings: false },
  moderator: { commandDeck: true, articles: true, moderation: true, orders: false, roles: true, siteSettings: false },
  admin: { commandDeck: true, articles: true, moderation: true, orders: true, roles: true, siteSettings: true },
};

export function capability(role, name) { return Boolean(ROLE_CAPABILITIES[role]?.[name]); }
export function canAccessCommandDeck(role) { return capability(role, "commandDeck"); }
export function canWriteArticles(role) { return capability(role, "articles"); }
export function isAdminRole(role) { return role === "admin"; }
