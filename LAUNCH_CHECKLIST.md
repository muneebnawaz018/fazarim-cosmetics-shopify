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

### Store policies — drafted, awaiting client

Drafts are written and tailored to the real configuration: [`docs/policies/`](docs/policies/)

Paste into `Settings → Policies`. Every `[SQUARE BRACKET]` is a decision only the client can make:
returns window, courier name, gateway name, COD fee, dispatch time, refund processing days,
phone, address, GST registration.

Not scripted deliberately. `shopPolicyUpdate` exists and the scopes could be added — but
injecting boilerplate legal text and marking it "done" creates the appearance of compliance
without anyone having read it.

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

### Product and collection pages

**Still stock Dawn.** Only the homepage has been built. A customer clicking any of the 9 category
tiles or 12 products lands on a page that looks nothing like the header we built.

### Remove Shopify's test products

17 generated snowboard / gift-card products remain. They do **not** appear on the homepage —
the smart collections filter on cosmetics tags — but they show in catalog and search.
Kept intentionally for testing. Delete once real inventory lands.

### Fill the empty collections

`accessories`, `gifts`, `nail-polish` have **zero products** — nothing carries those tags/types.
Their nav links and category tiles render blank. Needs real client inventory.

### Catalog depth

12 products across 6 homepage carousels means the same items repeat across Sale, New Arrivals,
Best Sellers, Makeup, and Skincare. The reference site carries hundreds — its density **is** the
design. Set client expectations.

### Confirm the shipping rate

`Standard — Rs 250, free over Rs 5,000, 3–5 business days`

Rs 250 is a placeholder in the normal band (domestic courier runs ~Rs 150–300). Use the client's
actual negotiated rate. Decide whether a COD fee is absorbed or passed on.

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
