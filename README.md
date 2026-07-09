# Fazarim Cosmetics — Shopify Store

Cosmetics store for a Pakistani client. Dawn-based theme, PKR, Pakistan-only delivery.

**Live dev store:** `fazarim-cosmetics.myshopify.com` (password `deotra`)
**Local preview:** `http://127.0.0.1:9292` — run `npm run dev`

---

## Start here

```bash
npm run dev      # hot-reload local preview, never touches the live theme
npm run stop     # kill it
```

That's the whole daily loop. Edit files in `fazarim-theme/`, save, browser reloads.

> ⚠️ **Never run `npm run push` or `npm run publish`** without asking first.
> The client shares the `ceo@fazarim.com` account — anything pushed is visible to them
> immediately. Build locally, push when it's ready to be seen.

---

## The docs, and when to read them

| doc | read it when |
|-----|--------------|
| **[DEV_COMMANDS.md](DEV_COMMANDS.md)** | You forgot a command. Every `npm` script, store ids, preview links. |
| **[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)** | Before going live, or when you wonder "is this done?" Tracks what's finished, what's blocked on the client, and why. |
| **[LAYOUT_REFERENCE.md](LAYOUT_REFERENCE.md)** | You're building a page and need to know what it should look like. Section-by-section design intent. |
| **[SHOPIFY_PROJECT_NOTES.md](SHOPIFY_PROJECT_NOTES.md)** | You need background: why Shopify, why PKR, why no Shopify Payments, which tasks are terminal vs browser. |
| **[docs/policies/](docs/policies/)** | Refund / shipping / privacy / terms drafts, ready for the client to review and paste. |

---

## Repo layout

```text
fazarim-theme/              the Shopify theme (Dawn 15.5 + our overrides)
  assets/fazarim-custom.css   our CSS — Dawn's own files stay untouched
  templates/index.json        homepage section order
  sections/header-group.json  header + announcement bar config

data/
  store-structure.json      PERMANENT — 14 collections + the 7-item nav tree
  assets.dummy.json         DUMMY — Unsplash placeholders, replace before launch

scripts/
  shopify-setup.mjs         store data automation (products, collections, nav, images)
  godaddy.sh                domain/DNS lookups (read-only)

sample-products.csv         12 products, Shopify CSV format
docs/policies/              legal drafts for the client
```

---

## Store automation

Shopify's CLI only does themes. Products, collections, and especially **navigation menus**
have no CLI and no CSV import — the Admin API is the only way. Hence:

```bash
npm run setup:verify   # check auth (never prints the token)
npm run setup:dry      # show every change, write nothing
npm run setup          # products → collections → images → nav menu
```

Idempotent: re-running skips whatever already exists. Safe to run any time.

Edit `data/store-structure.json` to add a collection or nav item, then re-run.
**Don't edit the script for data changes.**

Swapping in the client's real photography, without touching structure:

```bash
cp data/assets.dummy.json data/assets.client.json   # swap every URL
npm run images:client
npm run assets:client
```

---

## Credentials

Both gitignored, never committed, never printed:

| file | holds |
|------|-------|
| `.shopify.env` | Admin API token (`shpat_…`) |
| `.godaddy.env` | GoDaddy API key + secret |

Templates: `.shopify.env.example`. If a token leaks, uninstall the custom app in
Shopify Admin — that revokes it instantly.

---

## What's built

- Homepage: hero slideshow, 9-tile category grid, Sale / New Arrivals / Best Sellers /
  Makeup / Skincare carousels, promo banner, brand story, newsletter
- Header: logo left, 7-item mega menu with dropdowns, always-visible cart badge
- 12 products with sale badges, 14 auto-populating smart collections
- Store: PKR, Asia/Karachi, metric/grams, Pakistan-only market, Rs 250 shipping (free over Rs 5,000)

## What isn't

- **Product and collection pages** — still stock Dawn
- **All imagery is Unsplash placeholder** — legally must be replaced before launch
- Store policies drafted but not filled in or published
- Business entity, payment gateway, domain DNS — all blocked on the client

Details and reasons: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).
