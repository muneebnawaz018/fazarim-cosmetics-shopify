# Fazarim — Shopify Store

**Skincare, hair care and body care** for a Pakistani client. Dawn-based theme, PKR,
Pakistan-only delivery. Not a makeup brand — see [BRAND.md](BRAND.md).

**Live dev store:** `fazarim-cosmetics.myshopify.com` (password `deotra`)
**Local preview:** `http://127.0.0.1:9292` — run `npm run dev`

---

## Start here

```bash
npm run dev      # hot-reload local preview, never touches the live theme
npm run stop     # kill it
```

That's the whole daily loop. Edit files in `fazarim-theme/`, save, browser reloads.

> ⚠️ **`npm run push` deploys to the LIVE theme** — `Fazarim Custom` is the published
> theme, so a push is instantly visible to anyone with the store password, including the
> client on the shared `ceo@fazarim.com` account. Build locally; push only what can be seen.

---

## The docs, and when to read them

| doc | read it when |
|-----|--------------|
| **[BRAND.md](BRAND.md)** | **Start here for anything visual.** Verified palette (with contrast limits), typography, logo rules, the SRS homepage order, and every deviation from the client's documents. |
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

brand/
  fazarim-logo.png          real logo, trimmed to its bounding box
  fazarim-icon.png          icon mark

data/
  store-structure.json      PERMANENT — collections (+ intro copy, SEO meta), nav, `retire` list
  pages.json                index of the pages in content/
  assets.dummy.json         DUMMY — Unsplash placeholders, replace before launch

scripts/
  shopify-setup.mjs         store data automation (products, collections, nav, images)
  godaddy.sh                domain/DNS lookups (read-only)

content/                    page bodies (About Us, FAQ, Contact) as HTML
sample-products.dummy.csv   14 dummy products, Shopify CSV format
docs/policies/              legal drafts for the client
```

---

## Store automation

Shopify's CLI only does themes. Products, collections, and especially **navigation menus**
have no CLI and no CSV import — the Admin API is the only way. Hence:

```bash
npm run setup:verify   # check auth (never prints the token)
npm run setup:dry      # show every change, write nothing
npm run setup          # products → collections → images → covers → assets → logo → nav
```

Idempotent, and it **converges** rather than just skipping: a product whose tags changed in
the CSV gets retagged on the store. That matters — the tag-driven smart collections silently
miss a product that kept a stale tag.

Edit `data/store-structure.json` to add a collection or nav item, then re-run.
**Don't edit the script for data changes.**

Deleting is separate and never part of `setup`, because it can't be undone:

```bash
npm run prune:dry      # show what would be deleted
npm run prune          # delete the handles listed under `retire` in store-structure.json
```

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

- Brand identity: real logo, Option 1 palette (`#A64D79` mauve / `#6EC47C` green), Outfit +
  serif headers, pill buttons — all verified against the guidelines, see [BRAND.md](BRAND.md)
- Homepage in SRS order: 3-slide hero, Why Choose Fazarim, Shop by Category (3),
  Sale / New Arrivals / Best Sellers, Shop by Skin Concern (10), promo banner
- Header: real logo left, SRS mega menu (Sale · Skincare · Hair Care · Body Care ·
  Best Sellers · Kits & Bundles), always-visible cart badge
- Product page: gallery, sticky info, variant pills, trust row, and **per-product**
  Ingredients / How-to-use tabs driven by metafields (`npm run setup:tabs`)
- Collection pages: banner image, intro copy and SEO meta on all 26, filters + sorting
- About Us, FAQ (18 answers) and Contact — the client's own SRS copy, linked in the footer
- 14 dummy products across the real product lines, 26 auto-populating smart collections
- Store: PKR, Asia/Karachi, metric/grams, Pakistan-only market

## What isn't

- **All imagery is Unsplash placeholder** — legally must be replaced before launch
- **Larken headers** — commercial font, no webfont licence; Playfair Display stands in
- **Customer Reviews** (SRS §8.1.13) — would require inventing testimonials; needs a reviews app
- **Fazarim Academy** (SRS §6.2) — not built, omitted from nav so it can't 404
- Store policies drafted but not filled in or published
- Business entity, payment gateway, domain DNS — all blocked on the client

Details and reasons: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).
