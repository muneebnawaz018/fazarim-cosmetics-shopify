# Layout Reference — Fazarim Cosmetics

Strategy: **Shopaholic structure** + **Drunk Elephant finish**. Own brand/assets — NOT a pixel copy.
Both are the client's own references, named in SRS §1.6.

> **Read [BRAND.md](BRAND.md) first.** It carries the verified palette, type, logo rules and
> every deviation from the source documents. This file is the section-by-section build log.
>
> Fazarim sells **skincare, hair care and body care** — not makeup. Earlier revisions of this
> file assumed cosmetics and were wrong.

## Homepage sections (top → bottom)

Order is dictated by SRS §8.1.3–§8.1.14, not by us. Full table in [BRAND.md](BRAND.md#homepage--srs-81).

1. **Announcement bar** — "Free Shipping Over Rs. 10,000" (§8.1.4), rotating.
2. **Header** — logo left; mega-nav; search + account + cart (§8.1.5).
   - Nav: Sale, Skincare, Hair Care, Body Care, Best Sellers, Kits & Bundles.
   - Dropdowns: Skincare → Serums / Moisturizers / Cleansers / Sunscreen.
3. **Hero slider** — 3 slides, autoplay, dots (§8.1.6).
4. **Why Choose Fazarim** — 6 trust cards (§8.1.7).
5. **Shop by Category** — exactly 3: Skincare, Hair Care, Body Care (§8.1.8).
6. **Sale** — carousel (§8.1.9).
7. **New Arrivals** — carousel (§8.1.10).
8. **Best Sellers** — carousel (§8.1.11).
9. **Shop by Skin Concern** — 10 concern tiles (§8.1.12).
10. **Customer Reviews** (§8.1.13) — *not built; would need fabricated testimonials.*
11. **Footer** — 6 columns + newsletter (§8.1.14).

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
| Why Choose Fazarim | ✅ 6 trust cards, directly below hero per SRS §8.1.7 |
| Shop by Category | ✅ 3 tiles — collection cover images drive these (`npm run setup:covers`) |
| Sale / New Arrivals / Best Sellers | ✅ live, auto-populating smart collections |
| Shop by Skin Concern | ✅ 10 concern tiles |
| Customer Reviews | ❌ **not built** — would require inventing testimonials. Needs a reviews app |
| Promo banner | ✅ one `image-banner` |
| Footer | ⚠️ 3 of 6 SRS columns; payment icons off until a gateway exists |
| **Product page** | ❌ **stock Dawn** |
| **Collection page** | ❌ **stock Dawn** |
| Fazarim Academy | ❌ not built — omitted from nav so it can't 404 |

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
