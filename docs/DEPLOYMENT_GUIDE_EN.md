# NEXORA Tech Store — Deployment and User Guide

> **Document version:** 2026-08-29. This guide matches the current NEXORA source tree. It covers local development, GitHub, static hosting, aaPanel, cPanel, Supabase, payments, email, administration, customer usage, troubleshooting, and security.

## 1. What is NEXORA?

NEXORA is a dark-mode technology e-commerce platform with a public storefront and a protected **NEXORA Command Deck**. The frontend uses HTML5, CSS3, Vanilla JavaScript ES Modules, Font Awesome CDN, and Vite. Supabase provides Authentication, PostgreSQL, Row Level Security, Storage, and database RPCs. The Node.js/Express server serves the production build and supports backend routes such as tRPC, payment webhooks, storage proxy, and transactional email.

> **Security rule:** A publishable key or legacy anon key may appear in browser code, but Supabase secret/service-role keys, JWT secrets, SMTP passwords, payment provider secrets, webhook signing secrets, real payment details, and customer exports must never be committed to GitHub or exposed to the browser. Supabase describes publishable keys as public-component keys and recommends protecting the data layer with Auth and RLS [1].

## 2. Main pages and features

| Area | URL | Features |
| --- | --- | --- |
| Storefront | `/` | Catalog, search, category/price/sale filters, Flash Sale, Sale Hunt, quick view, product gallery, cart, checkout, and responsive mobile UI. |
| Account Center | Open from the account button | Profile, username, password, phone, multiple shipping addresses, wallet balance, ledger, and notifications. |
| Orders | `/orders.html` | Order list/detail, payment status, fulfillment status, carrier, tracking number, shipment location, cancellation and return requests when eligible. |
| Affiliate | `/affiliate.html` | Referral link, clicks, eligible orders, and commissions for the signed-in affiliate. |
| Content | `/info.html` | About, FAQ, terms, privacy, delivery, returns, and contact information. |
| Articles | `/article.html?slug=<slug>` | Published articles; authoring and moderation depend on role/capability. |
| Command Deck | `/admin.html` | Dashboard, products, orders, customer accounts, roles, CMS, logistics, sales, email, notifications, and CSV export. |

The checkout flow is: browse products → add to cart → sign in → verify phone/address → create an order through a database RPC → show QR/manual payment instructions → contact the shop when required → staff reconciles and updates the order.

## 3. Requirements

| Component | Recommended | Purpose |
| --- | --- | --- |
| Git | Current stable version | Clone, update, and review source. |
| Node.js | 20 LTS or 22 LTS | Run Vite, esbuild, and the Express server. |
| pnpm | Compatible with the lockfile | Install reproducible dependencies. |
| Supabase | Separate project | Auth, schema, RLS, Storage, and data. |
| Domain | HTTPS | Production Auth redirects and secure browser behavior. |
| Hosting | Static or Node.js | Choose based on whether backend routes are required. |

GitHub Pages, Netlify, Vercel static, Cloudflare Pages, and cPanel static hosting can publish `dist/public`. aaPanel, an Ubuntu VPS, or cPanel Passenger can run the Node server. GitHub Pages publishes static files and does not run server-side applications [2].

## 4. Local setup

### 4.1 Clone and install

```bash
git clone https://github.com/minhduc290613/tech-ecommerce-store.git
cd tech-ecommerce-store
pnpm install
```

Configure `client/supabase-config.js` with your own public values:

```js
export const SUPABASE_URL = "https://your-project-id.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_your_public_key";
```

Start development:

```bash
pnpm dev
```

Open `http://localhost:3000/`, `/admin.html`, `/orders.html`, `/affiliate.html`, or `/info.html`. The server reads `PORT`; if the preferred port is busy, it searches for an available port. Always use the port printed by the terminal.

### 4.2 Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server with Vite hot reload. |
| `pnpm test` | Run the Vitest regression suite. |
| `pnpm check` | Validate the single-SQL layout and TypeScript. |
| `pnpm build` | Build all pages into `dist/public` and bundle the server as `dist/index.js`. |
| `pnpm start` | Run the production Node server. |
| `pnpm format` | Format source with Prettier. |

The project does not define a `pnpm preview` script. Use `pnpm start` to test the server build, or serve `dist/public` with a static server.

## 5. Supabase setup

Create a project at the [Supabase Dashboard](https://supabase.com/dashboard). From **Project Settings → API Keys**, copy the Project URL and Publishable key. Legacy anon keys may work for existing projects, but never put a secret/service-role key in `client/`. Public keys do not replace RLS; the database must still enforce authorization [1].

Open **SQL Editor** and run the complete `supabase-unified.sql` once on a new or empty project. This canonical file contains the catalog, orders, order items, customer profiles, wallet ledger, address book, roles/capabilities, CMS, articles, moderation, affiliate, sale campaigns, logistics, after-sales, transactional email, customer notifications, and platform notifications.

Do not rerun the complete unified file on a production database containing real orders without a backup and a migration plan. The repository intentionally keeps one canonical SQL file; `pnpm check` and `pnpm build` validate that no extra schema SQL file has been added.

Enable **Authentication → Sign In / Providers → Email**. Under **Authentication → URL Configuration**, set the production Site URL and add local, preview, and production redirect URLs. Supabase Auth issues JWTs that work with RLS to authorize rows for the signed-in user [3].

To grant administrator access, first create the user through the storefront, then run a targeted SQL statement using the real user ID/email:

```sql
insert into public.admin_users (user_id)
select id from auth.users
where email = 'admin@your-domain.example'
on conflict (user_id) do nothing;
```

Do not use a default admin password. Use the Command Deck role manager or the project’s protected RPCs for additional role assignments.

## 6. Using the platform

### Customers

Customers can register, sign in, manage their username/password, update phone and shipping details, save multiple addresses, select a default address, review wallet movements, follow orders, read notifications, and submit eligible cancellation/return requests. Checkout verifies both phone and address and stores a shipping snapshot on the order.

For bank transfer or ZaloPay, customers scan the QR code, copy the account number and transfer content, and contact the shop when instructed. Clicking “Payment completed” does not automatically confirm a bank transfer. The shop or authorized staff must reconcile the transaction first.

### Admin and MKT

Admins open `/admin.html` and use the dashboard, Catalog, Orders, Accounts, Roles, CMS, Logistics, Sales, Email, and Notifications workspaces. MKT users see features allowed by their capability set. The Notifications workspace can send a site-wide announcement or target one account. Site-wide broadcasts require confirmation before publishing and are recorded in history. Do not place passwords, tokens, card data, or sensitive customer information in notification text.

### Notifications

The storefront header shows a notification bell and unread badge beside Orders. The notification center combines order updates with store announcements. Users can open an item, follow its safe CTA, and mark it as read. Platform notification reads are stored per user; one customer cannot mark another customer’s notification as read.

### Roles

| Role | Typical responsibility |
| --- | --- |
| Admin | Full management, CMS, roles, accounts, order/payment operations, notifications, and settings. |
| Moderator | Comment/review and article moderation according to assigned capabilities. |
| Marketing | Articles, sale campaigns, and platform announcements when granted. |
| Order manager | Order review and processing. |
| Logistics | Carrier, tracking, shipment timeline, and location updates. |
| Affiliate | Approved referral links and personal performance metrics. |
| User | Shopping, account management, orders, wallet, and personal notifications. |

Frontend visibility is not an authorization boundary. Every sensitive operation must remain protected by PostgreSQL functions and RLS.

## 7. GitHub deployment

Push source only after reviewing the working tree:

```bash
git status
git add .
git commit -m "Prepare NEXORA deployment"
git push origin main
```

Before making a repository public, search for secrets:

```bash
git ls-files | grep -E '(^|/)(\.env|.*secret|service_role|credentials)' || true
grep -RniE 'service_role|sb_secret_|SMTP_PASSWORD|JWT_SECRET' --exclude-dir=node_modules --exclude-dir=dist . || true
```

If a real secret was committed, rotate it immediately. Deleting the file in a later commit is not enough because the value may remain in Git history.

### GitHub Pages

Build locally or in GitHub Actions and publish `dist/public`. If publishing from a branch/folder, the publishing folder must contain its own top-level `index.html`. GitHub Pages supports static files and custom domains, but not Node server routes [2]. Configure Supabase Site URL and redirect URLs for the final Pages domain. A repository project site may use a subpath; review absolute links such as `/admin.html` and `/orders.html`, or use a custom domain served at the root.

GitHub Pages is a static delivery layer, not a database backup or a secret store. Do not upload customer exports, payment credentials, SMTP passwords, or unencrypted backups.

## 8. Static hosting: Netlify, Vercel, Cloudflare Pages, and cPanel

Use:

```bash
pnpm install
pnpm test
pnpm check
pnpm build
```

Set **Build command** to `pnpm build` and **Publish directory** to `dist/public`. Choose Node 20 or 22 for the build environment. Confirm that all multipage entrypoints exist after deployment: `index.html`, `admin.html`, `orders.html`, `affiliate.html`, `info.html`, and `article.html`.

Static hosting is suitable for the browser-to-Supabase parts of the platform. It does not run `pnpm start`, Express routes, transactional-email routes, payment webhooks, or other server code. If those features are required, run the Node server on aaPanel, a VPS, cPanel Passenger, or another Node-compatible service. Never put a backend secret in a `VITE_*` variable because Vite bundles it into client assets.

## 9. aaPanel on Ubuntu

aaPanel’s Node.js Project feature can manage Node versions, PM2 processes, domain reverse proxy, SSL, and logs [4].

1. Install Node.js version manager, Git, and pnpm. Select Node 20 or 22 LTS.
2. Create the domain and point DNS to the server IP. Enable SSL.
3. In **Website → Node Project → Add Node Project**, clone the Git repository or select the project path.
4. Use `/www/wwwroot/nexora` as an example path, `pnpm` as package manager, `pnpm install --frozen-lockfile` as install command, `pnpm build` as build command, and `pnpm start` as start command.
5. Set `NODE_ENV=production`, `PORT`, and all required server-side environment variables in aaPanel. Do not place secret values in `client/`.
6. Bind the domain as a reverse proxy to the local Node port and run the application as a limited user such as `www`, not root.
7. On updates, pull Git changes, install dependencies if the lockfile changed, build, and restart the Node/PM2 process.

If the domain returns 502, inspect the Node/PM2 log, verify the actual `PORT`, confirm the reverse proxy target, and check that the process is running. aaPanel’s official Node project guide documents domain binding, SSL, PM2, versions, and project logs [4].

## 10. cPanel deployment

### Static cPanel hosting

Run `pnpm build` elsewhere and upload the contents of `dist/public` to `public_html`. This requires no Node server, but it cannot run Express, server-side email routes, payment webhooks, or `pnpm start`. Enable SSL and add the final domain to Supabase Auth URL Configuration.

### cPanel Application Manager/Passenger

cPanel’s Application Manager uses Phusion Passenger as an application server, process manager, and reverse proxy. The hosting provider must enable Application Manager, Passenger, `mod_env`, and a compatible Node package [5]. cPanel recommends performing application steps as the cPanel user rather than root [6].

1. Clone the repository into a directory such as `/home/<cpanel-user>/nexora` using Git Version Control or cPanel Terminal.
2. Select Node 20 or 22 if provided by the host.
3. Run `pnpm install --frozen-lockfile` and `pnpm build`.
4. Register the application in **Software → Application Manager** with the domain/subdomain, a path relative to the home directory, Production environment, and the required environment variables.
5. Use the project production entrypoint `dist/index.js` if the panel supports a custom startup file. If Passenger only searches for `app.js`, ask the host how to set `PassengerStartupFile` or how to create an ESM-compatible wrapper; do not guess this configuration.
6. Deploy/restart and inspect the application `logs/` directory if the app fails.

Passenger may control reverse port binding. The project reads `process.env.PORT`; do not expose a hardcoded public Node port. If startup fails, verify the startup file, application root, Node version, permissions, dependencies, and Passenger logs.

## 11. Payments, email, and media

Configure QR/payment details only after the schema and frontend are working. Replace placeholders with real values in the appropriate protected configuration area and test a small transaction. Manual transfers remain pending until reconciled by staff.

Automatic transfer providers such as VietQR Host2Host, SePay, or Casso must remain disabled until the provider secret, webhook URL, and signing secret are configured on the backend. SMTP/API email also stays in safe no-send mode until server secrets and sender-domain verification are complete. Admins may edit email templates but must not be shown stored secrets.

Brand images, product galleries, OG images, article covers, and carrier logos can be uploaded from the Command Deck or provided as HTTPS URLs. Avoid committing large media into the frontend bundle; use Supabase Storage/CDN or the project’s managed asset workflow.

## 12. Production checklist

| Check | Expected result |
| --- | --- |
| Database | `supabase-unified.sql` applied to the intended project; production data backed up before changes. |
| RLS | Sensitive tables have RLS and user-scoped reads. |
| Auth | Sign-up, sign-in, sign-out, recovery, Site URL, and redirect URLs work. |
| Catalog | Prices, inventory, sale rules, gallery, and availability are correct. |
| Checkout | Server/database recalculates price; phone/address are required; order is created once. |
| Payment | QR details are real and manually reconciled before confirmation. |
| Email | Sender domain and mailbox test completed before enabling real delivery. |
| Roles | Admin, MKT, Moderator, Logistics, and Affiliate capabilities are correct. |
| Notifications | Badge, read state, broadcast, target user, and CTA validation work. |
| Hosting | HTTPS, logs, process restart, and domain routing are verified. |
| Release | `pnpm test`, `pnpm check`, and `pnpm build` pass. |

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `pnpm` not found | pnpm is not installed or PATH is stale. | Install pnpm for the selected Node version and reopen the terminal. |
| Catalog cannot load | Wrong project URL/key, missing schema, or RLS denial. | Check `client/supabase-config.js`, Supabase project, Network tab, and schema. |
| Admin access denied | User is not in `admin_users` or lacks the required role. | Grant access through the protected setup process and sign in again. |
| Order creation fails | Missing auth, address, phone, stock, or RPC permission. | Check each condition; never trust browser price values. |
| QR is incorrect | Placeholder or unsaved payment configuration. | Replace values and test the QR before opening sales. |
| Email contains localhost | Production Site URL/redirect URL is missing or stale. | Update Supabase and hosting URLs, restart the server, and retry recovery. |
| aaPanel returns 502 | Process stopped, wrong port, or proxy mismatch. | Inspect PM2/Node logs, `PORT`, reverse proxy target, and build output. |
| cPanel Passenger fails | Wrong startup file, path, Node version, or missing module. | Check Application Manager and `logs/`; ask the host about Passenger configuration. |
| GitHub Pages is blank | Wrong publish directory or subpath/absolute-link mismatch. | Publish `dist/public`, verify all multipage files, and consider a custom domain. |
| Notification badge stays empty | User is signed out, RPC is denied, or stale browser cache. | Check session, RLS/RPC grants, Network tab, and hard refresh. |

## 14. Security and backups

Use HTTPS, MFA for administrator accounts, least-privilege hosting users, protected environment variables, RLS, audit logs, and regular review of Supabase Security Advisor. Rotate any secret that may have leaked. GitHub stores source, not production database, Auth users, Storage bytes, or a safe replacement for encrypted backups.

## 15. Official references

[1] [Supabase — API Keys](https://supabase.com/docs/guides/getting-started/api-keys)

[2] [GitHub Docs — Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

[3] [Supabase — Auth](https://supabase.com/docs/guides/auth)

[4] [aaPanel — Node.js Project](https://www.aapanel.com/docs/Function/Node.html)

[5] [cPanel — Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/)

[6] [cPanel — How to Install a Node.js Application](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
