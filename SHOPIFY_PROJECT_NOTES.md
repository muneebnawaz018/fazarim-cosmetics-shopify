# Shopify Cosmetics Store — Project Context

Background and constraints. For commands see [DEV_COMMANDS.md](DEV_COMMANDS.md);
for what's left before launch see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Goal

Cosmetics/beauty store on Shopify. Layout inspired by:

- [shopaholic.com.pk](https://www.shopaholic.com.pk/) — layout twin, drives homepage structure
- [drunkelephant.com](https://www.drunkelephant.com/) — footer style only

Replicate the **layout patterns** (category mega-nav, promo hero, category tiles,
New Arrivals / Best Sellers / Sale grids, ingredient callouts) with our own brand and assets.

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
| Payment gateway setup | NO — admin dashboard |
| Store currency, address, timezone, units | NO — admin dashboard (API is read-only; `PUT /shop.json` returns 406) |
| Markets, shipping zones, policies | NO — admin dashboard |
| Business entity | NO — organization settings, needs client's legal identity |

Shopify's CLI does **themes only**. There is no `shopify product import`, and navigation menus
have no CSV import at all — GraphQL is the only programmatic route. That's why
`scripts/shopify-setup.mjs` exists.

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
