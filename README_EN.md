# NEXORA Tech Store

NEXORA is a dark-mode technology e-commerce platform with a public storefront, customer Account Center, order tracking, Affiliate Dashboard, and the protected **NEXORA Command Deck**. The frontend uses HTML5, CSS3, Vanilla JavaScript ES Modules, and Vite. Supabase provides Authentication, PostgreSQL, Row Level Security, Storage, and RPCs. The Node.js/Express server serves the production build and handles backend routes such as tRPC, payment webhooks, storage proxy, and transactional email.

## Documentation

| Language | Guide |
| --- | --- |
| English | [Complete Deployment and User Guide](docs/DEPLOYMENT_GUIDE_EN.md) |
| Vietnamese | [Hướng dẫn triển khai và sử dụng A–Z](docs/HUONG_DAN_A_Z.md) |
| Documentation index | [docs/INDEX.md](docs/INDEX.md) |
| Admin setup | [ADMIN_SETUP.md](ADMIN_SETUP.md) |

## Applications

| Application | URL | Purpose |
| --- | --- | --- |
| Storefront | `/` | Catalog, search, filters, Flash Sale, Sale Hunt, product gallery, cart, checkout, and responsive mobile UI. |
| Orders | `/orders.html` | Customer order list/detail, payment and fulfillment status, carrier, tracking, shipment location, and eligible after-sales requests. |
| Affiliate Dashboard | `/affiliate.html` | Personal referral clicks, qualifying orders, and commissions. |
| Information | `/info.html` | About, FAQ, terms, privacy, delivery, returns, and contact pages. |
| Command Deck | `/admin.html` | Vietnamese administration interface. |
| Command Deck English | `/admin-en.html` | English administration interface using the same Auth, Supabase, RLS, role, and management logic. |

## Main capabilities

The platform supports product catalog management, pricing and sale campaigns, inventory and product galleries, customer accounts, multiple shipping addresses, wallet and ledger history, manual QR/ZaloPay payment confirmation, logistics tracking, cancellation and return workflows, article publishing, review/comment moderation, affiliate referrals, email templates, customer notifications, platform broadcasts, CSV reports, and role-based administration.

The English Command Deck is a presentation layer over the same secure application logic. Admins and authorized staff use the same credentials and permissions at `/admin-en.html`; changing the language does not bypass RLS, capability checks, payment confirmation rules, or audit behavior.

## Quick start

```bash
git clone https://github.com/<github-user>/<repository>.git
cd <repository>
pnpm install
pnpm dev
```

Open `http://localhost:3000/`, `/admin-en.html`, `/orders.html`, or `/affiliate.html`. Before release, run:

```bash
pnpm test
pnpm check
pnpm build
pnpm start
```

The production static output is `dist/public`. The bundled Node server is `dist/index.js`.

## Supabase configuration

Create a Supabase project and set the Project URL and Publishable key in `client/supabase-config.js`:

```js
export const SUPABASE_URL = "https://your-project-id.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_your_public_key";
```

Run the complete `supabase-unified.sql` once on a new or empty project. Do not rerun the complete schema on a production database with real orders without a backup and an approved migration plan. Enable Email authentication and add local, preview, and production URLs under Supabase Auth URL Configuration.

A publishable/anon key may be visible in browser code when RLS is correctly configured. Never expose `service_role`, `sb_secret_...`, JWT secrets, SMTP passwords, payment API keys, webhook signing secrets, or customer exports. Secret values belong only in protected server/hosting environment variables.

## Deployment choices

| Hosting | Recommended output | Important limitation |
| --- | --- | --- |
| GitHub Pages | `dist/public` through GitHub Actions or a publishing branch | Static only; it does not run Node, Express, email routes, or payment webhooks. |
| Netlify, Vercel, Cloudflare Pages | Build command `pnpm build`; publish `dist/public` | Use a separate Node backend when server routes are required. |
| cPanel static | Upload `dist/public` to `public_html` | No `pnpm start` or Passenger backend. |
| aaPanel Ubuntu | Node Project/PM2 with `pnpm start` and reverse proxy | Requires Node, SSL, process management, and server environment variables. |
| cPanel Passenger | Application Manager with Node 20/22 and production entrypoint | Startup file and Passenger support depend on the hosting provider. |

Read [DEPLOYMENT_GUIDE_EN.md](docs/DEPLOYMENT_GUIDE_EN.md) for step-by-step instructions for each option.

## Security and operational rules

Do not use a default administrator password. Create an Auth user, then grant the required Admin role through the protected setup process. Keep RLS enabled. Manual bank transfers remain pending until reconciled by authorized staff. Automatic transfer providers and transactional email remain in safe no-send mode until backend secrets, webhook verification, and sender-domain configuration are complete.

Do not place real customer data, payment credentials, secrets, or unencrypted database backups in GitHub. Use HTTPS, MFA for administrator accounts, least-privilege hosting users, audit logs, and regular backups.

## Source layout

```text
client/
├── index.html, app.js, style.css       # storefront
├── admin.html, admin-en.html           # Vietnamese/English Command Deck entrypoints
├── admin.js, admin-i18n.js             # shared admin logic and English presentation layer
├── orders.html, affiliate.html         # customer order and affiliate pages
├── info.html, article.html             # public content pages
└── supabase-config.js                  # public URL + publishable key

docs/                                   # Vietnamese and English documentation
supabase-unified.sql                    # canonical database/RLS/RPC schema
vite.config.ts                          # Vite multi-page build
package.json                            # development and release commands
```

## Official references

[1] [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)

[2] [Supabase Auth](https://supabase.com/docs/guides/auth)

[3] [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

[4] [aaPanel Node.js Project](https://www.aapanel.com/docs/Function/Node.html)

[5] [cPanel Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/)

## License

This project is licensed under the [MIT](LICENSE) license.
