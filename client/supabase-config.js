/* Public configuration only. Never place a Supabase service_role key here. */
const env = typeof import.meta !== "undefined" ? import.meta.env || {} : {};

export const SUPABASE_URL = String(
  env.VITE_SUPABASE_URL || "https://qdsqacpdoxsznyywdrgd.supabase.co",
).trim();

export const SUPABASE_ANON_KEY = String(
  env.VITE_SUPABASE_ANON_KEY || "sb_publishable_mZruXNPAPb4caa5VyCvRTg_cnb_hbrS",
).trim();

export const SUPABASE_CONFIG_SOURCE = env.VITE_SUPABASE_URL
  ? "render-environment"
  : "repository-fallback";
