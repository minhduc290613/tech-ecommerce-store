export const ROLE_CAPABILITIES = {
  customer: { commandDeck: false, articles: false, moderation: false, orders: false, roles: false, siteSettings: false },
  affiliate: { commandDeck: false, articles: true, moderation: false, orders: false, roles: false, siteSettings: false },
  marketing: { commandDeck: true, articles: true, moderation: false, orders: false, roles: false, siteSettings: false },
  order_manager: { commandDeck: true, articles: false, moderation: false, orders: true, roles: false, siteSettings: false },
  moderator: { commandDeck: true, articles: true, moderation: true, orders: false, roles: true, siteSettings: false },
  admin: { commandDeck: true, articles: true, moderation: true, orders: true, roles: true, siteSettings: true },
};

export function resolveRoleCapabilities(role, roleDefinitions = []) {
  const custom = Array.isArray(roleDefinitions) ? roleDefinitions.find((item) => item.role_key === role)?.capabilities : null;
  return { ...(ROLE_CAPABILITIES[role] || {}), ...(custom || {}) };
}
export function capability(role, name, roleDefinitions = []) { return Boolean(resolveRoleCapabilities(role, roleDefinitions)[name]); }
export function canAccessCommandDeck(role, roleDefinitions = []) { return capability(role, "commandDeck", roleDefinitions); }
export function canWriteArticles(role, roleDefinitions = []) { return capability(role, "articles", roleDefinitions); }
export function isAdminRole(role) { return role === "admin"; }
