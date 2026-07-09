# Layout Reference — Fazarim Cosmetics

Strategy: **Shopaholic structure** (proven PK cosmetics) + **Drunk Elephant finish** (premium whitespace, clean type, ingredient callouts). Own brand/assets — NOT a pixel copy.

## Homepage sections (top → bottom)

1. **Announcement bar** — thin strip. "Free Shipping Over Rs. X" (PKR). Optional rotating.
2. **Header** — logo left; mega-nav center/left; search + account + cart (with count) right.
   - Mega-nav categories: Sale, Makeup, Skincare, Bath & Body, Hair, Accessories, Gifts.
   - Dropdowns: Makeup → Face / Eye / Lips / Nails / Tools. Nested (Foundation, Concealer, Palettes...).
3. **Hero banner** — big promo image + CTA ("Shop Sale" / "Shop New"). Slideshow-capable.
4. **Category tiles** — grid of round/square tiles w/ icon+label: Makeup, Foundation, Lips, Eye, Moisturizer, Skincare, Bath & Body, Hair, Nail, Concealer.
5. **Product grids** (repeat blocks):
   - New Arrivals
   - Best Sellers
   - Sale
   - each: card = image, name, PKR price, star rating, "Add to Bag" / "Choose options".
6. **Ingredient / brand-difference callout** (Drunk Elephant flavor) — "Why Fizaram" values, clean formulas.
7. **Instagram / UGC feed** (optional) — social proof grid.
8. **Newsletter signup** — "15% off first order" hook. Email capture.
9. **Footer** — category links, About/Learn, Contact/Shipping/Returns/FAQ, social icons, legal, region/currency.

## Style

- Palette: cream / neutral / white bg, lots of whitespace (Drunk Elephant). Accent = brand color (TBD).
- Clean typography, high-contrast product photos.
- Currency: PKR (Rs.). Star ratings on cards.

## Refs

- [shopaholic.com.pk](https://www.shopaholic.com.pk/) — layout twin, drives full homepage structure
- [drunkelephant.com](https://www.drunkelephant.com/) — footer style only (per user, 2026-07-06)

## Build status

| section | state |
| ------- | ----- |
| Announcement bar | ✅ "Free shipping on orders over Rs. 5,000" — matches the real shipping rate |
| Header + mega-nav | ✅ logo left, 7 categories with dropdowns, cart badge, Poppins bold uppercase |
| Hero slideshow | ✅ 2 slides — **placeholder imagery** |
| Category tiles | ✅ 9 across (Dawn caps at 6; overridden in `assets/fazarim-custom.css`) |
| Sale / New Arrivals / Best Sellers | ✅ live, auto-populating smart collections |
| Makeup / Skincare grids | ✅ |
| Promo banner | ✅ one `image-banner` — reference stacks several |
| Brand callout ("Why Fazarim") | ✅ `multicolumn` |
| Instagram / UGC feed | ❌ not built |
| Newsletter | ✅ |
| Footer | ⚠️ stock Dawn — Drunk Elephant treatment not applied |
| **Product page** | ❌ **stock Dawn** |
| **Collection page** | ❌ **stock Dawn** |

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
