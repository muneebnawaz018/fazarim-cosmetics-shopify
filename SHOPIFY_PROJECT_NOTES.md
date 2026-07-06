# Shopify Cosmetics Store — Project Context

## Goal
Build a cosmetics/beauty e-commerce store on Shopify. Layout inspired by:
- https://www.shopaholic.com.pk/ (Shopify, Pakistani cosmetics — closest twin)
- https://www.drunkelephant.com/ (Shopify Plus, premium skincare polish)

Replicate the **layout patterns** (category mega-nav, promo hero, category tiles,
New Arrivals / Best Sellers / Sale grids, ingredient callouts) with own brand/assets.
NOT a pixel copy — their images/copy/logos are copyrighted.

## Target market
Pakistan (`.pk`). Currency PKR. Matters for payment gateways.

## Payment (Pakistan constraints)
- Shopify Payments NOT available in Pakistan → must use third-party gateway.
- Options (2026): XPay (XStak), UnumPay, PayFast, Paymob, Safepay, JazzCash, Easypaisa, PayPro.
  XPay / UnumPay = multi-gateway Shopify apps (local banks + JazzCash/Easypaisa).
- Payment config is done in Shopify ADMIN DASHBOARD (browser), NOT the terminal/CLI.

## Terminal vs browser
| Task | Terminal? |
|---|---|
| Theme build/customize/deploy | YES — Shopify CLI |
| Custom app / storefront code | YES — CLI |
| Products/orders bulk ops | YES — Admin API / CSV |
| Payment gateway setup | NO — admin dashboard |
| Store settings, domains, checkout | NO — admin dashboard |

## Store info (dev store)
- Store URL: `fazarim-ybm0afcu.myshopify.com`
- Dev theme ID: `164568760570`
- Local preview: http://127.0.0.1:9292 (while `shopify theme dev` running)
- Storefront password: NOT stored here (kept out of git). Read/reset it in Admin → Online Store → Preferences → Password protection. Pass via `shopify theme dev --store-password <pw>`.

## Status / what's done
- Shopify CLI installed globally: `shopify version` -> 4.3.0
- Node 24, npm 11.
- Dev store created + CLI authed. Dawn 15.5.0 theme scaffolded in fazarim-theme/.
- Homepage build IN PROGRESS (shopaholic structure + drunk-elephant footer). Placeholder images only — real assets pending from user.

## Next steps (order matters)
USER (browser, free, ~10 min):
1. Make Partner account -> partners.shopify.com (free, no card)
2. Partner dashboard -> Stores -> Add store -> Development store. Free build sandbox.
3. Copy store URL: yourname.myshopify.com

CLAUDE (terminal):
4. `shopify theme init` -> pull Dawn (free official base theme)
5. Build layout to match refs (nav, hero, category tiles, product grids)
6. `shopify theme dev --store yourname.myshopify.com` -> live preview

LATER (user, browser):
7. Add products, logo, brand colors
8. Payment gateway (XPay/PayFast) signup + admin config
9. Buy plan (~$29-39/mo Basic) + custom domain -> go live

## Cost
- Build + test: FREE (dev store, unlimited time)
- Go live: Basic plan ~$29-39/mo + domain (~$10-15/yr) + gateway fees (~2-3%)

## Key CLI commands
```
shopify theme init          # scaffold theme from Dawn
shopify theme dev           # local preview + live reload (needs store)
shopify theme push / pull   # sync with store
shopify theme check         # lint
shopify auth login          # connect account (browser OAuth)
```

## NOTE
This project is SEPARATE from the HRMS repo. Do not mix. HRMS conventions do not apply here.
