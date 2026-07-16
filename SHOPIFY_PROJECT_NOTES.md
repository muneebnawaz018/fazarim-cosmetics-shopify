# Fazarim — Project Context

Background and constraints. For commands see [DEV_COMMANDS.md](DEV_COMMANDS.md);
for what's left before launch see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Goal

**Skincare, hair care and body care** store on Shopify — soaps, hair oils, shampoos, lotions,
serums. **Not makeup.** See [BRAND.md](BRAND.md) for what the client's documents actually say.

Design references, both named by the client in SRS §1.6:

- [shopaholic.com.pk](https://www.shopaholic.com.pk/) — navigation + homepage inspiration
- [drunkelephant.com](https://www.drunkelephant.com/) — homepage layout + footer inspiration

Replicate the **layout patterns** with our own brand and assets.

**NOT a pixel copy.** Their images, copy, and logos are copyrighted. Structure and component
architecture are fair to imitate; their photography and taglines are not.

## Target market

Pakistan. Currency PKR. Delivery within Pakistan only. This drives everything below.

## Payment — the constraint that shapes launch

**Shopify Payments is not available in Pakistan.** The client cannot use Shopify's built-in
card checkout. They need a third-party gateway, and Shopify charges an **extra transaction fee**
on top of the gateway's own — this hits the client's margin, so raise it early.

Options (2026): XPay (XStak), UnumPay, PayFast, Paymob, Safepay, JazzCash, Easypaisa, PayPro.
XPay and UnumPay are multi-gateway Shopify apps covering local banks plus JazzCash/Easypaisa.

Most Pakistani e-commerce runs on **Cash on Delivery**. COD carries a courier fee
(~Rs 50–100 or a % of order value), and **COD refunds are manual** — no automatic reversal
like a card. The client needs a refund process before the first return, not after.

Payment setup happens in the **Admin dashboard**, not the CLI.

## Terminal vs browser

| Task | Terminal? |
|---|---|
| Theme build / customize / deploy | YES — Shopify CLI |
| Products, collections, nav menus, image uploads | YES — Admin API (`npm run setup`) |
| Payment gateway setup | NO — no API exists |
| Store currency, address, timezone, units | NO — admin dashboard (API is read-only; `PUT /shop.json` returns 406) |
| Markets, shipping zones, policies | NO — not scoped today; policies/shipping are scriptable if scoped (see below) |
| Business entity | NO — organization settings, needs client's legal identity |

Shopify's CLI does **themes only**. There is no `shopify product import`, and navigation menus
have no CSV import at all — GraphQL is the only programmatic route. That's why
`scripts/shopify-setup.mjs` exists.

## API scopes — what the token can actually reach

Two separate things decide whether a task can be scripted. Don't confuse them:

1. **Does a mutation exist?** If not, no scope helps — it's Admin UI forever.
2. **Do we hold the scope?** If not, it's one (annoying) grant away.

> **Introspection lists all 452 mutations regardless of scope.** `pageCreate` is visible to
> our token right now and would fail if called. **Visible ≠ callable.** Absence from the
> schema proves impossible; presence proves nothing. Probe with a real read to know.

Granted to the custom app today — verified via `GET /admin/oauth/access_scopes.json`:

```text
read_files  write_files
read_products  write_products
read_online_store_navigation  write_online_store_navigation
```

Probed read access (2026-07-16):

| resource | today | needed for |
| -------- | ----- | ---------- |
| products, collections, menus, files, metafields | ✅ | everything built so far |
| **pages** | ❌ `ACCESS_DENIED` | About Us (§8.2), FAQ (§8.5), Contact (§8.6) |
| **blogs / articles** | ❌ | Blog (§8.4), Fazarim Academy (§6.1) |
| **shop policies** | ❌ | the four drafts in `docs/policies/` |
| **deliveryProfiles** | ❌ | the free-shipping threshold |
| discounts, markets, customers, orders | ❌ | promos, analytics |

### Never scriptable — no mutation exists at any scope

Verified: `PUT /shop.json` → **406**, and the schema has no mutation for these.

- Store currency, address, country, timezone, units
- Business entity
- Payment gateway installation
- App installation, theme publishing

### The free-shipping rate — scoped, readable, still not writable

`write_shipping` is granted and `deliveryProfiles` reads fine, but **`deliveryProfileUpdate`
refuses this particular rate**:

```text
This method definition cannot be updated because it uses new configurations that are
only available through Shopify's updated APIs. Please use the new updated API for
associating multiple conditions to a method definition.
```

Same error on `2025-01` and `2026-07` (the newest version this store supports). There is no
`deliveryMethodDefinitionUpdate` or `deliveryConditionUpdate` anywhere in the schema — **the
"updated API" the error names does not exist yet.** Shopify shipped the feature in the Admin
UI ahead of the API.

Why: the rate uses Shopify's newer **conditional pricing** — one method definition whose price
changes with order total — not the legacy two-separate-rates model. The read shows the same
ID twice:

```text
[on] Standard   250.00 PKR     ← gid://…/DeliveryMethodDefinition/841418244309
[on] Standard     0.00 PKR     ← same id, condition TOTAL_PRICE >= 5000 PKR
```

**Do not try to work around it by deleting and recreating the rate.** A failed recreate leaves
the store with no shipping rate and a broken checkout, and it rebuilds the config in a
different shape than the merchant configured.

Change it in the Admin: [Settings → Shipping](https://admin.shopify.com/store/fazarim-cosmetics/settings/shipping)
→ Pakistan zone → **Standard** → the conditional price row → edit the minimum → Save.

Re-check afterwards with the `deliveryProfiles` query — `npm run scopes` probes it.

### Check what's granted

```bash
npm run scopes
```

Prints granted vs needed, then **live-probes each one** — because a scope can be listed and
still rejected. Run it after any Admin change to confirm it actually took.

### How to change the app's scopes

The custom app is called **`fazarim`**. Scopes are edited in the Admin — there is no API for
changing your own grants (that would defeat the point).

1. Open **[Apps → Develop apps](https://admin.shopify.com/store/fazarim-cosmetics/settings/apps/development)**
2. Click **fazarim**
3. **Configuration** tab → **Admin API integration** → **Edit**
4. Tick the scopes you need (search the box — the list is long)
5. **Save**
6. A banner appears saying the app must be updated → click **Update app** / **Install app**
7. Back in your terminal:

   ```bash
   npm run scopes
   ```

   - All ✅ and no `DENIED` → done, the token still works.
   - `HTTP 401` → **the token rotated.** Go to the **API credentials** tab, reveal the new
     Admin API access token, and replace `SHOPIFY_ADMIN_TOKEN` in `.shopify.env`.

> Shopify does not always rotate the token on a scope change, so do not swap it in advance.
> Run `npm run scopes` and let the result tell you. Step 7 covers both outcomes.

**Batch the change.** Each round trip is Admin clicking plus a possible token swap. Add
everything you know you'll need in one pass rather than three.

### Scope-by-scope

| scope | why | note |
| ----- | --- | ---- |
| `read_content` + `write_content` | About Us (§8.2), Blog (§8.4), FAQ (§8.5), Contact (§8.6), Academy (§6.1) | **Certain.** The next real blocker. SRS §8.5 already has 17 written FAQ answers ready to script in |
| `write_shipping` | the free-shipping threshold | Optional — a rate change is 4 clicks in Admin. Worth it only if rates change often |
| `write_discounts` | promo codes | SRS FAQ §17 promises "discounts or promotions" |
| `read_orders`, `read_customers` | reading real order/customer data | **See the warning below** |

### Before granting `read_orders` / `read_customers`

Right now this is harmless — the dev store has **zero customers and zero orders**, so there is
nothing to expose. That changes the day the store goes live.

These scopes turn `.shopify.env` into a file that can read **real customers' names, addresses,
phone numbers and order history**. Under Pakistani expectations and the store's own privacy
policy, that is the client's data to protect, and the token sits in plain text on a
developer laptop.

Worth knowing:

- **Shopify's theme does not need these scopes.** Customer accounts, login, order history and
  order tracking are all built in — Liquid's `customer` object serves them with no API access
  at all. These scopes are for *scripts that read order data*, e.g. reporting or migration.
- Grant them when there is a script that needs them, not in advance.
- **Revisit before the store transfers to the client.** A token with customer-data access
  should not outlive the reason it was created.

### On MCP servers

**MCP does not solve scopes.** It is a transport. Any Shopify Admin MCP server authenticates
with the same `shpat_` token and gets the same `ACCESS_DENIED`.

Third-party Admin MCP packages (`shopify-mcp`, `complete-shopify-mcp`, …) would mean handing
the client's live store token to an unaudited npm package. Same call we already made for
GoDaddy, where we wrote `scripts/godaddy.sh` instead of registering a third-party MCP.

`@shopify/dev-mcp` is official and different — docs/schema lookup only, no token, no store
access. Safe, but marginal: introspection already answers those questions.

## Store info (dev store)

- **Store handle:** `fazarim-cosmetics` → `fazarim-cosmetics.myshopify.com`
- **Custom theme:** `Fazarim Custom`, id `160480395477`
- **Partner org:** Fazarim Cosmetics, owner `ceo@fazarim.com`
- **Storefront password:** `deotra` (dev gate; Admin → Online Store → Preferences)
- **Plan:** development store — free, unlimited time, cannot take real orders

The store transfers to the client at launch and **becomes** production. It is not a staging copy.
Every setting configured now carries over — no reconfiguration needed.

## Links

- **Storefront:** [fazarim-cosmetics.myshopify.com](https://fazarim-cosmetics.myshopify.com)
- **Admin:** [admin.shopify.com/store/fazarim-cosmetics](https://admin.shopify.com/store/fazarim-cosmetics)
- **Theme editor:** [open editor](https://admin.shopify.com/store/fazarim-cosmetics/themes/160480395477/editor)
- **Products:** [Products](https://admin.shopify.com/store/fazarim-cosmetics/products)
- **Collections:** [Collections](https://admin.shopify.com/store/fazarim-cosmetics/collections)
- **Navigation:** [Menus](https://admin.shopify.com/store/fazarim-cosmetics/menus)
- **Settings → General:** [currency, timezone, units](https://admin.shopify.com/store/fazarim-cosmetics/settings/general)
- **Settings → Markets:** [markets](https://admin.shopify.com/store/fazarim-cosmetics/settings/markets)
- **Settings → Shipping:** [zones and rates](https://admin.shopify.com/store/fazarim-cosmetics/settings/shipping)
- **Settings → Policies:** [legal policies](https://admin.shopify.com/store/fazarim-cosmetics/settings/policies)
- **Settings → Apps:** [custom app / API token](https://admin.shopify.com/store/fazarim-cosmetics/settings/apps/development)
- **Organization (business entities):** [organization settings](https://admin.shopify.com/organization)
- **Shopify Partners:** [partners.shopify.com](https://partners.shopify.com)
- **GitHub repo:** [muneebnawaz018/fazarim-cosmetics-shopify](https://github.com/muneebnawaz018/fazarim-cosmetics-shopify)
- **Local preview:** `http://127.0.0.1:9292` (only while `npm run dev` is running)

## Environment

- Shopify CLI 4.4.0, Node 24, npm 11
- Theme: Dawn 15.5.0, in `fazarim-theme/`
- Automation script: zero dependencies, uses Node's global `fetch`

## Domain — no longer ours to control

`fazarim.com` was **transferred to the client's GoDaddy account**. Our API credentials now get
`403 ACCESS_DENIED` on its DNS. The client's team must add Shopify's DNS records at launch.

DNS currently points `@` at a GoDaddy WebsiteBuilder placeholder, not Shopify.
`scripts/godaddy.sh` still works for domains we *do* control.

Email (`ceo@fazarim.com`) runs on **Zoho**, set up by the client's team.

## Working agreement

Build locally, preview at `127.0.0.1:9292`. **Never `theme push` or `git push` without
explicit consent** — the client shares the `ceo@fazarim.com` account, so anything pushed
to the live theme is immediately visible to them.

## NOTE

This project is SEPARATE from the HRMS repo. Do not mix. HRMS conventions do not apply here.
