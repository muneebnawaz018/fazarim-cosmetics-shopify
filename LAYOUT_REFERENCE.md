# Layout Reference — Fazarim Cosmetics

Strategy: **Shopaholic structure** + **Drunk Elephant finish**. Own brand/assets — NOT a pixel copy.
Both are the client's own references, named in SRS §1.6.

> **Read [BRAND.md](BRAND.md) first.** It carries the verified palette, type, logo rules and
> every deviation from the source documents. This file is the section-by-section build log.
>
> Fazarim sells **skincare, hair care and body care** — not makeup. Earlier revisions of this
> file assumed cosmetics and were wrong.

## Homepage sections (top → bottom)

Order mirrors **Shopaholic's live homepage** (user decision 2026-07-22): hero → category tiles
→ Sale → New Arrivals → promo → Best Sellers → Skincare → Hair Care → Skin Concern → trust
props → footer. This deviates from SRS §8.1.3, which wants Why Choose directly under the hero
— the client's own reference site does the opposite. Full table in [BRAND.md](BRAND.md#homepage--srs-81).

1. **Announcement bar** — "Free Shipping Over Rs. 10,000" (§8.1.4), rotating.
2. **Header** — logo left; mega-nav; search + account + cart (§8.1.5).
   - Nav: Sale, Skincare, Hair Care, Body Care, Best Sellers, Kits & Bundles.
   - Dropdowns: Skincare → Serums / Moisturizers / Cleansers / Sunscreen.
3. **Hero slider** — 3 slides, autoplay, dots (§8.1.6).
4. **Shop by Category** — exactly 3: Skincare, Hair Care, Body Care (§8.1.8).
5. **Sale** — carousel (§8.1.9).
6. **New Arrivals** — carousel (§8.1.10).
7. **Promo banner** — image-banner between the carousels, as Shopaholic does.
8. **Best Sellers** — carousel (§8.1.11).
9. **Skincare / Hair Care** — two category carousels (mirrors Shopaholic's Makeup/Skincare pair).
10. **Shop by Skin Concern** — 10 concern tiles (§8.1.12).
11. **Why Choose Fazarim** — 6 trust cards (§8.1.7), above the footer like Shopaholic's benefits strip.
12. **Customer Reviews** (§8.1.13) — *not built; would need fabricated testimonials.*
13. **Footer** — newsletter + columns (§8.1.14).

## Header — measured from the reference, not estimated

Values read off [shopaholic.com.pk](https://www.shopaholic.com.pk/) in DevTools at a 1800px
viewport (2026-08-04). Re-measure before changing any of them; screenshots are not accurate
enough for this, and earlier passes went wrong by eyeballing ratios off cropped images.

| property | reference | ours |
| -------- | --------- | ---- |
| Container | 1400px, contents flush to its edges | same |
| Nav type | DM Sans 14px / 700, tracking −0.07px, solid black, uppercase | Outfit 14px / 700, tracking 0, solid black |
| Nav gaps | 24px plain, 34px where a caret follows | same |
| Icon glyphs | 28px, 24x24 viewBox, 1.2 outline stroke, black | same |
| Icon pitch | 42px | 41–42px |
| Cart badge | 18px circle, 3px inside the icon's top edge | 17px, 3px inset, mauve |

The header icons were redrawn as outlines to match (`assets/icon-search.svg`, `icon-account.svg`,
`icon-cart.svg`, `icon-cart-empty.svg`). Geometry is ours — the reference's own path data is
their asset, so only the style was matched: 24x24 viewBox, 1.2 stroke, `currentColor`.

Dawn's originals could not be sized uniformly: the cart art filled ~43% of a 40x40 viewBox while
search and account filled 18x19 edge to edge, so one size rule rendered the cart at half scale.
All four now share a viewBox and fill it consistently.

Two deliberate departures: the **typeface stays Outfit** (brand, Guidelines p.14 — the
reference's DM Sans is theirs, not ours), and the **cart badge stays mauve** rather than their
black, per client preference. Everything else is matched to the measurement.

Tap targets stay at 4.4rem even though the reference uses 40px buttons — the glyph and pitch
match visually while the hit area stays comfortable.

## Product grids — measured from the reference

Read in DevTools at 1440px (2026-08-04):

| property | reference | ours |
| -------- | --------- | ---- |
| Cards per row | 5 | 5 |
| Card width | 249px | 228–241px (our container is 45px narrower) |
| Gap | 25px | 24px (theme setting steps by 4) |
| Image ratio | square, 1.0 | square |
| Card title | DM Sans 13px / 400 | Outfit 14px / 400 |
| Card price | DM Sans 16px / 400 | 16px / 400 |

Applied to the five homepage carousels, the collection grid and search results.
Dawn's default was 4 across with portrait images and ~20px bold serif titles, which is what
made the sections look oversized — the card titles were competing with the section headings.

`products_per_page` is capped to steps of 4 by Dawn's schema (min 8, max 36), so 20 is used —
four clean rows of five. 25 is rejected by the theme editor.

### Container width — the rule everything hangs off

The reference container is **`min(1400px, 100% - 96px)`**: it grows to 1400px on wide screens
and keeps a 48px margin on narrower ones. Measured content start: 201px at 1800px viewport,
48px at 1440px.

Dawn instead uses a fixed max-width plus a fixed 5rem padding, so the content box loses 100px at
*every* size. That mismatch caused two visible bugs — the header sitting 50px inside the
reference line at 1800px, and (after the header padding was removed to fix that) the nav sitting
20px from the screen edge at 1440px. One `.page-width` rule now handles both, and since `.header`
is itself a `.page-width` element, the header and the sections finally share one axis.

Carousels needed the same treatment: Dawn's desktop product sliders are full-bleed, spanning the
whole viewport with a fake gutter on the first slide, which sliced the last card at the screen
edge. They are now bounded to the container, so every row ends where the headings end.

Bounding the track broke the card width as a knock-on. Dawn sizes desktop slider cards as
`(100% - var(--desktop-margin-left-first-item)) / 5 - spacing * 2` — maths that only holds on a
full-bleed track, where the first term pays for the fake gutter and the second for the card
peeking in from the right. Against a 1344px container it took 58px + 48px off every card,
rendering a 249px card at 209px, so five cards filled 1141px of the row and a sixth and part of
a seventh drifted into view. Cards are now sized off the row itself: 5 x 249.6 + 4 x 24 gap =
1344 exactly. Five per view, the rest scroll, and the card lands on the reference's 249px.

**A carousel needs more products than columns.** Below six products Dawn renders a plain static
row with no arrows at all — that is a data condition, not a layout fault. See
[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) on the ten invented products seeded to clear it.

### Shop by Category — 10 tiles, 5 per row

Matches the reference's "PRODUCT CATEGORIES" pattern: broad categories mixed with specific
product types. Uses collections that already exist — Skincare, Serums, Moisturizers, Cleansers,
Sunscreen / Hair Care, Shampoo, Hair Oil, Body Care, Lotions.

**Deviates from SRS §8.1.8**, which specifies exactly three categories. User decision
2026-08-04: match the reference's density. The three SRS categories are all still present as
tiles, alongside seven subcategories.

## Style

- Palette: brand Option 1 — mauve `#A64D79`, green `#6EC47C` accent, black/white. See [BRAND.md](BRAND.md#colour).
- Type: Playfair Display (standing in for Larken) + Outfit Light. Pill buttons, uppercase.
- Currency: PKR (Rs.).

## Refs

- [shopaholic.com.pk](https://www.shopaholic.com.pk/) — navigation + homepage inspiration (SRS §1.6)
- [drunkelephant.com](https://www.drunkelephant.com/) — homepage layout + footer inspiration (SRS §1.6)
- **Brand Guidelines PDF** + **SRS PDF** — the authorities. Digested in [BRAND.md](BRAND.md).

## Build status

| section | state |
| ------- | ----- |
| Announcement bar | ✅ "Free Shipping Over Rs. 10,000" — matches the live shipping rate |
| Header + mega-nav | ✅ real logo left, SRS nav with dropdowns, cart badge |
| Hero slideshow | ✅ 3 slides per SRS — **placeholder imagery** |
| Why Choose Fazarim | ✅ 6 trust cards in one row, above the footer (Shopaholic position; SRS deviation 8) |
| Shop by Category | ✅ 3 tiles — collection cover images drive these (`npm run setup:covers`) |
| Sale / New Arrivals / Best Sellers / Skincare / Hair Care | ✅ live, auto-populating smart collections |
| Shop by Skin Concern | ✅ 10 concern tiles |
| Customer Reviews | ❌ **not built** — would require inventing testimonials. Needs a reviews app |
| Promo banner | ✅ one `image-banner` |
| Footer | ⚠️ newsletter + brand (with address) + Shop + Help; payment icons off until a gateway exists. Full 6-column split needs pages that don't exist yet |
| **Product page** | ✅ gallery, sticky info, variant pills, per-product Ingredients / How-to-use / Shipping tabs, trust row |
| **Collection page** | ✅ banner image + intro copy + SEO meta on all 26, horizontal filters, sorting, 24/page matching the homepage card style |
| About Us / FAQ / Contact | ✅ SRS §8.2 / §8.5 (18 Qs) / §8.6 copy, linked in the footer |
| Fazarim Academy | ❌ not built — omitted from nav so it can't 404 |
| Blog | ❌ not built — SRS §8.4 is an empty heading |
| Breadcrumbs | ✅ product / collection / page / search, with JSON-LD (SRS §11.1) |

Social icons sit in the announcement bar, not top-right of the header as in the reference —
Dawn has no markup for that, it needs a `header.liquid` change.

## Project links

- Repo: [github.com/muneebnawaz018/fazarim-cosmetics-shopify](https://github.com/muneebnawaz018/fazarim-cosmetics-shopify)
- Storefront: [fazarim-cosmetics.myshopify.com](https://fazarim-cosmetics.myshopify.com)
- Admin: [admin.shopify.com/store/fazarim-cosmetics](https://admin.shopify.com/store/fazarim-cosmetics)
- Local preview: `http://127.0.0.1:9292` (`npm run dev`)
- Full URL list: [SHOPIFY_PROJECT_NOTES.md](SHOPIFY_PROJECT_NOTES.md#links)
- What's left before launch: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
- Commands: [DEV_COMMANDS.md](DEV_COMMANDS.md)
