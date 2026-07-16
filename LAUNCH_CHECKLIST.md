# Fazarim Cosmetics — Launch Checklist

Everything that must be true before the store takes a real order.
Store: `fazarim-cosmetics.myshopify.com` — development store, free, Partner org `Fazarim Cosmetics`.

Verify the store settings against reality at any time:

```bash
npm run setup:verify
```

> **The dev store becomes production.** It is not a staging copy. Transfer it to the client and
> pick a paid plan — every setting below carries over. Nothing needs reconfiguring.

---

## 🔒 Blocked on the client — the developer cannot do these

### Business entity → Pakistan

The store's business entity is **United States**. This is the client's **legal and tax identity**:
it decides who receives payouts and who is liable for tax. Shopify requires a real person's
**full name, date of birth, and residential address**.

**Do not fill this in with the developer's details.** It would register the client's store to the
developer, and the entity travels with the store when it transfers.

Consequences while it stays US:

| field | stuck at |
| ----- | -------- |
| `Settings → General → Store address → Country` | **greyed out** — "Change country in business details" |
| `country_code` | `US` |
| `province`, `city`, `phone` | empty |

> The street address itself is known (Office no. 401, Building A1, Sheranwala Heights, near
> Izmir Town, Canal Road, Lahore) and is already in the policy drafts, contact page and footer.
> Only this Settings → General field stays locked until the entity moves to Pakistan.
| `Shop location` (shipping origin) | `United States` |

Harmless on a dev store — no real orders, shipments, or payouts. A hard blocker at launch.

**Client must:**

1. `admin.shopify.com/organization` → **Business entities** → **Add**
2. Country **Pakistan**, business type **Individual** (sole proprietor) or **Company** (SECP-registered)
3. Enter their own name / DOB / address
4. `Settings → General → Business details` → **⋯** → switch the store to the new entity
5. Archive the old US entity (only possible once it reads "Used by 0 stores")
6. Store address country then unlocks → set the real Pakistani address

> Changing an entity's country does not edit it — Shopify **forks a new entity** and leaves the
> store attached to the old one. Step 4 is mandatory or nothing changes.

### Payment gateway

**Shopify Payments does not operate in Pakistan.** No built-in card checkout.

Options: XPay (XStak), UnumPay, PayFast, Paymob, Safepay, JazzCash, Easypaisa, PayPro.
Shopify charges an **extra transaction fee** on third-party gateways — this affects margin.

Most Pakistani orders are **Cash on Delivery**. COD adds a courier fee (~Rs 50–100 or a %),
and **COD refunds are manual** — no automatic reversal. The client needs a refund process
defined before the first return.

#### Footer payment icons — off on purpose

`payment_enable: false` in `sections/footer-group.json`.

The store has **zero payment providers installed** (`paymentSettings.supportedDigitalWallets`
returns `[]`). With icons on, Dawn loops `shop.enabled_payment_types` and Shopify serves its
dev-store placeholder set: Visa, Mastercard, Amex, **PayPal**, Diners, Discover. PayPal does
not operate in Pakistan at all, and Amex/Diners/Discover are barely issued there. A customer
would see a payment promise the checkout cannot keep.

**Turn it back on once a gateway is installed.** `shop.enabled_payment_types` populates
itself from the live gateway — install Safepay and the footer shows Visa/Mastercard/PayPak
with no theme change. Do not hardcode icons: Easypaisa and JazzCash logos are trademarks we
have no licence to ship, and `payment_type_svg_tag` has no type for them. If the client wants
those marks, they must supply licensed assets and a custom snippet.

### Free shipping threshold — RESOLVED 2026-07-16

Banner and checkout agree. Live config, verified over the API:

```text
zone: Pakistan
  [on] Standard   250.00 PKR
  [on] Standard     0.00 PKR   when TOTAL_PRICE >= 10000.00 PKR
```

Announcement bar reads "Free Shipping Over Rs. 10,000" per SRS §8.1.4.

Changed by hand in the Admin — **not scriptable**, and not for want of scope.
`write_shipping` is granted and the rate reads fine, but `deliveryProfileUpdate` rejects it:
the rate uses Shopify's newer conditional pricing, which has no mutation in any API version
this store supports. See
[SHOPIFY_PROJECT_NOTES.md](SHOPIFY_PROJECT_NOTES.md#the-free-shipping-rate--scoped-readable-still-not-writable).

> The threshold is a margin decision, not a spec detail: Rs 250 is absorbed on every order
> over the line. Rs 5,000 was the earlier deliberate choice; Rs 10,000 follows the SRS.
> Worth a final word with the client before launch.

### Brand fonts — Larken is unlicensed

Headers currently render in **Playfair Display**, standing in for **Larken**, which the brand
guidelines specify. Larken is commercial (Ellen Luff) and is not on Google Fonts or in
Shopify's library.

A **webfont licence is separate from the desktop licence** used to make the PDF. Ask the
designer/agency which they hold. If a webfont licence exists, get the `.woff2` files —
swapping is a one-line change. Details in [BRAND.md](BRAND.md#larken-is-not-licensed).

### Logo — missing formats

Client supplied 1080×1080 PNGs only. Still needed:

- **SVG / vector** — PNG will soften on high-DPI screens and print
- **White or reversed variant** — current artwork is mauve-on-transparent and disappears on
  dark backgrounds. Blocks any dark header or dark promo section.
- **Horizontal lockup** — the full logo is 5.3:1; the icon is near-square. Fine for now.

### Customer Reviews section — needs a reviews app

SRS §8.1.13 specifies a testimonial carousel. **Not built**: the store has no customers, so
building it means inventing testimonials. Needs Judge.me / Loox / Shopify Product Reviews
collecting from real orders. Dawn has no native reviews section.

### Fazarim Academy — not built

SRS §6.1/§6.2 put it in the primary nav: educational videos, skin and hair guides, doctor
consultations, downloadable resources. None exist. **Omitted from the menu** so it can't 404.
This is a substantial feature, not a page — scope it with the client.

### SEO requirements

Breadcrumbs are **done** (2026-07-16): rendered on product, collection, page and search
templates with schema.org BreadcrumbList JSON-LD. Product trails route through the browse
category (Home > Hair Care > Argan Hair Oil). Product image ALT text is set on all 14 images.

Still outstanding: the §6.3 URL scheme (`/skincare/serums`, `/academy`) which **Shopify cannot
produce** — its URL structure is fixed at `/collections/<handle>`. Flag to the client.

### FAQ contradicts the refund policy — client must pick one

Two customer-facing documents disagree on the single clause most likely to cause a dispute:

| document | says |
| -------- | ---- |
| `/pages/faq` (SRS §8.5, verbatim) | "Returns and exchanges are accepted **only** for damaged, defective, or incorrectly delivered products" |
| `docs/policies/refund-policy.md` | "You have **7 days** from the day your order arrives to request a return" — unopened items, any reason |

One grants a change-of-mind return, the other refuses it. A customer will read the refund
policy, request a return, and support will point at the FAQ.

**The client decides which is the real policy**, then the loser gets rewritten. Both are live
copy — this is a commercial decision, not a wording tidy-up.

### FAQ promises payment methods the store cannot take

`/pages/faq` says: *"We currently offer: Cash on Delivery (COD), Debit & Credit Cards, Online
Bank Transfer, Mobile Wallets (where available)."*

The store has **zero payment providers installed** (`supportedDigitalWallets: []`). The copy is
the client's own and will be true once a gateway is live — but if the store launched today,
that answer would be false. Same root cause as the footer payment icons above.

Recheck when the gateway lands; if only COD ships at launch, the answer needs cutting down.

### Store policies — drafted, awaiting client

Drafts are written and tailored to the real configuration: [`docs/policies/`](docs/policies/)

Paste into `Settings → Policies`. Every `[SQUARE BRACKET]` is a decision only the client can make:
returns window, courier name, gateway name, COD fee, dispatch time, refund processing days,
phone, address, GST registration.

`write_legal_policies` is now granted and verified, so these **can** be scripted the moment the
client signs off. They have not been: every draft still carries `[SQUARE BRACKETS]`, and pushing
legal text nobody has read would create the appearance of compliance rather than compliance.

The live privacy policy is still **Shopify's generic auto-generated boilerplate** (18,308 chars)
— not the tailored draft in `docs/policies/privacy-policy.md`. It is live and wrong for this
business. Refund, shipping and terms have no body at all, so those URLs 404, which is why the
footer does not link them.

The clauses most likely to cause disputes, already written in:

- **Opened cosmetics are not returnable** (hygiene). Customers will still ask.
- **COD refunds require a manual bank transfer.**
- **Patch-test / allergy language** in Terms.

### Fake locations

`Settings → Shipping` reads **"1 of 3 locations"**. Two are Shopify test-data locations:

- `My Custom Location` — 123 Main St, Toronto, Canada
- `Snow City Warehouse` — app-owned; uninstall the fulfillment app to remove it

One has been deactivated. Never click **"Start shipping"** on either — it would add a Canadian
warehouse as a fulfillment origin. `Shop location` itself is blocked on the entity above.

---

## ⚠️ Developer tasks before launch

### Replace all dummy imagery — legal exposure

Every product photo, hero slide, and promo banner is a **royalty-free Unsplash placeholder
depicting other brands' products**. Shipping these is both a brand and a legal problem.

```bash
cp data/assets.dummy.json data/assets.client.json
# swap every URL for the client's own photography, then:
npm run images:client
npm run assets:client
```

Structure is never touched — `data/store-structure.json` stays as is.
See the `$warning` field in `data/assets.dummy.json`.

### Remove Shopify's demo products

The dev store still carries **14 snowboards**, a ski wax, and a gift card that Shopify generated.
They do not reach the homepage — the smart collections filter on skincare / hair-care /
body-care tags — but they show in search and `/collections/all`.

Our own first-pass makeup products and their collections were deleted on 2026-07-16
(`npm run prune` — 4 products, 10 collections). The homepage is now entirely Fazarim products.

Shopify's demo collections `frontpage`, `automated-collection` and `hydrogen` also remain.
Neither the snowboards nor those collections are in the `retire` list — add them there and
re-run `npm run prune` if you want them gone.

### Catalog depth

14 products across 6 homepage carousels means the same items repeat across Sale, New Arrivals
and Best Sellers. The reference site carries hundreds — its density **is** the design.
Set client expectations.

### Ingredient lists are dummy data

`custom.ingredients` and `custom.how_to_use` carry plausible INCI-style lists written for
development. **They are invented.** Cosmetics ingredient disclosure is a safety matter — an
allergen omitted or wrongly listed is a real problem for a real customer, and the Terms draft
leans on ingredients being "correctly listed on the product".

The client must supply the actual INCI list for every product before launch. They go in the
`Ingredients` and `How To Use` columns of the products CSV, then `npm run setup:tabs`.

### Confirm the shipping rate with the client

`Standard — Rs 250, free over Rs 10,000, 3–5 business days`

Rs 250 sits in the normal band (domestic courier runs ~Rs 150–300) but is still a placeholder —
use the client's actual negotiated rate. Decide whether a COD fee is absorbed or passed on.

The Rs 10,000 threshold follows SRS §8.1.4; Rs 5,000 was the earlier deliberate choice. Rs 250
is absorbed on every order above the line, so this is a margin decision the client should make.

### Checkout and email

- **Checkout settings** — guest checkout vs. accounts required, abandoned-cart emails
- **Email notifications** — order confirmations still carry default Shopify branding
- **Taxes** — reads "Not collecting". Client decides on GST registration.

### Connect the domain

`fazarim.com` was **transferred to the client's GoDaddy account**. The developer no longer controls
its DNS (`403 ACCESS_DENIED`). The client's team must add Shopify's DNS records.

DNS currently points `@` at a GoDaddy WebsiteBuilder placeholder, not Shopify.

### Publish and unlock

- Publish the `Fazarim Custom` theme (id `160480395477`)
- `Online Store → Preferences` → remove the store password (`deotra`)
- Transfer the dev store to the client and select a paid plan

---

## ✅ Done

### Store settings

| setting | value | note |
| ------- | ----- | ---- |
| Currency | **PKR** | `money_format: Rs.{{amount}}` |
| Time zone | **Asia/Karachi** | was America/New_York — orders would timestamp a day off |
| Unit system | **Metric** | |
| Default weight unit | **Gram (g)** | not kg — cosmetics ship at 30g/50ml; shipping rates compute from this |
| Markets | **Pakistan / PKR active** | Canada + US set to Draft; `presentment_currencies: PKR` only |
| Shipping zone | **Pakistan (PK)** | `Standard` — Rs 250, free over Rs 5,000, 3–5 days |

Deleted: the `Express` rate (priced in USD, test data) and the `International` zone
(27 countries offering **free worldwide shipping at Rs 0.00** — inert only because those
markets are drafted).

### Store data — all scripted, idempotent

```bash
npm run setup      # products → collections → images → nav menu
```

- **12 products** imported from `sample-products.csv`, with compare-at prices → sale badges render
- **14 smart collections**, auto-populating by tag/type, so new products file themselves
- **Nested nav menu**: Sale · Makeup (4 sub) · Skincare (3 sub) · Bath and Body · Hair · Accessories · Gifts
- **15 images** uploaded (12 product + 2 hero + 1 promo)

Data lives in `data/store-structure.json` (permanent) and `data/assets.dummy.json` (throwaway).
Edit those, not the script.

### Theme

- Homepage: hero slideshow, 9-tile category grid, Sale / New Arrivals / promo banner /
  Best Sellers / Makeup / Skincare, brand story, why-us, newsletter
- Header: logo left, 7-item mega menu, sticky, country/language selectors removed
- Typography: Playfair Display (serif) → **Poppins Bold**, uppercase tracked nav
- **Cart badge always visible** — Dawn hid it on an empty cart; the reference shows `0`
- **9-across category row** — Dawn caps `columns_desktop` at 6, and its `.grid` is flexbox with
  calc'd widths, so the override recomputes width rather than using `grid-template-columns`
- All overrides in `assets/fazarim-custom.css`; Dawn's own stylesheets untouched for upgradability

### Bugs fixed in Dawn itself

- **`header-drawer.liquid`** ignored `enable_country_selector` — the mobile drawer rendered a
  country picker even when the setting was off. Desktop respected it; mobile didn't.
- **`theme.liquid` / `password.liquid`** read `scheme_classes` before assigning it. Liquid tolerates
  `nil | append:` so it worked, but it was undefined-variable access. Theme-check offenses: 8 → 6.

---

## Gotchas — learned the hard way, don't repeat

- **Currency is NOT gated by the business entity.** The *store address* is. We assumed the opposite
  and nearly collected someone's date of birth for nothing. **Test the currency dropdown first.**
- **Currency change does not convert prices.** `2500` stays `2500`, relabelled `Rs 2,500`.
  The CSV values were already rupee amounts, so nothing needed re-pricing.
- **Currency locks permanently after the first real order.** Changed while the store was empty.
- **Shipping rates carry their own currency**, separate from the store's. They stayed USD (`$8.00`)
  after the store went PKR. There's a "Change currency" link inside each rate dialog.
- **Markets are independent of the store address** — the CAD/USD problem was fixable without
  touching the entity.
- **Store settings are read-only via the Admin API.** `PUT /shop.json` → `406`. No GraphQL mutation
  exists for currency, address, timezone, or units. Admin UI only. (Verified, not assumed.)
- **npm sets `INIT_CWD`**, and Shopify CLI trusts it over a `cd` in an npm script — producing a false
  "not in a theme directory" warning and `Failed to delete` errors. Use `--path ./fazarim-theme`.
- **Legacy custom apps**: Partners can still create them, but only **before transferring the store**
  to the merchant. Create the API token now; after transfer, Shopify disables new custom apps.
