# TI Baseball (Tools of Ignorance) — static website

A mobile-friendly multi-page website for TI Baseball (Tools of Ignorance), Ajax, ON. Established 2024.
Built with plain HTML, CSS, and a tiny bit of JS — no build step, hostable
anywhere (Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, etc.).

## Pages
- `index.html` — Home (hero, philosophy, programs preview, coach intro, CTA)
- `coach.html` — Coach Crosby's profile and "blueprint for success"
- `programs.html` — Training formats, position-specific skills, performance & tech, future camps
- `pricing.html` — Sliding-scale model, training formats, group tier table
- `contact.html` — Contact form, address, embedded map

## Files
- `styles.css` — shared stylesheet (teal/pink/black palette pulled from the logo)
- `script.js` — mobile nav toggle, active link highlighting, contact-form UX
- `assets/logo.svg` — SVG recreation of the TOI logo (see notes below)

## Things you should update before going live

### 1. Replace the logo
The original PNG logo wasn't accessible as a file in the session, so I built
an SVG recreation in `assets/logo.svg` using the same colors and style.

To use your real PNG instead:
1. Save your logo as `assets/logo.png`.
2. In each of the five HTML files, find/replace `assets/logo.svg` → `assets/logo.png`.
   (There are four references per page: favicon, nav, hero/footer, etc.)

### 2. Hook up the contact form
The form on `contact.html` points to a Formspree placeholder. To start
receiving submissions:
1. Sign up at https://formspree.io (free tier is fine).
2. Create a new form, copy its endpoint (e.g. `https://formspree.io/f/abcd1234`).
3. In `contact.html`, replace `https://formspree.io/f/YOUR_FORM_ID` with that
   endpoint.

Other options that drop in the same way: Netlify Forms, Basin, Web3Forms,
Getform — all work with a plain `<form action="...">`.

### 3. Update the email and phone
In `contact.html`, search for:
- `hello@toibaseball.ca` → replace with your real email (2 places: visible text and `mailto:`)
- `(905) 555-0199` → replace with your real phone (2 places: visible text and `tel:`)

### 4. Optional polish
- Drop in real photos. The "feature" blocks use coloured placeholder panels —
  swap them for real action photos by replacing the `<div class="visual">…</div>`
  blocks with `<img>` tags wrapped in the same container.
- Add a `favicon.ico` if you'd rather not use the SVG favicon.

## How to view it locally
Just open `index.html` in a browser — no server needed. If you'd rather serve
it:

```
cd toi-baseball
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## How to deploy

**Netlify (drag-and-drop):** open https://app.netlify.com/drop and drag the
whole `toi-baseball` folder onto the page. Live in 30 seconds.

**Cloudflare Pages / Vercel / GitHub Pages:** push the folder to a git repo
and connect it — there's no build step, just point them at the root.

## Browser support
Tested layout works on modern Chrome, Safari, Firefox, and mobile Safari/Chrome
down to ~360px wide. The hamburger menu kicks in below 820px.
