# TI Baseball — tibaseball.com

Cloudflare Pages site for TI Baseball (Tools of Ignorance), Ajax ON.

## Layout

- `_worker.js` — single-file advanced-mode Cloudflare Pages Worker. Contains all
  routes, API handlers, auth, Stripe/Cal.com/Resend integrations, inlined HTML
  pages, and admin UI. ~800KB.
- `_routes.json` — Cloudflare Pages route config (worker handles all paths).
- `*.html` — public-facing page sources. Inlined into the worker as `*_HTML`
  constants. Edit here AND rebuild the worker constant in `_worker.js` when
  changing a page. (See `scripts/rebuild-html-constant.py` if present.)
- `assets/` — images + media served from `/assets/`.
- `styles.css` — shared stylesheet.
- `script.js` — shared site JS (Cal.com embed, nav toggle, year stamp, etc.).

## Deploy

Pushes to `main` auto-deploy to production via Cloudflare Pages GitHub
integration. To deploy manually:

```
cd <this dir>
wrangler pages deploy . --project-name=ti-baseball --branch=main
```

## Secrets (NEVER commit)

These live in the Cloudflare Pages project's environment variables, never in
this repo:
- `STRIPE_RECONCILE_KEY` — Stripe restricted API key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `CAL_COM_API_KEY` — Cal.com v2 API key
- `RESEND_API_KEY` — Resend transactional email
- `RECONCILE_SECRET` — internal reconciliation secret

KV namespace bindings (Cloudflare Dashboard):
- `USERS_KV` (id: f71e6910c1cd46599c04bfe06f4a33f2)
- `SESSIONS_KV` (id: c6fdc52bbb00417cadc73979606ebf84)
- `RESET_KV` (id: fdc5cc64fafd4c33a79d743a18a7d564)

_Last verified live: 2026-06-29T21:36:57Z_
