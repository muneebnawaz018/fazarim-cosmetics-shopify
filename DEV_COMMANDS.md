# Fazarim Shopify — Dev Commands

- Store: `fazarim-cosmetics.myshopify.com` (dev store, Partner org, login `ceo@fazarim.com`)
- Custom theme: **Fazarim Custom** — id `160480395477`
- Store password (dev gate): `deotra`

> ⚠️ Use `--path ./fazarim-theme` from repo root — NOT `cd` inside npm scripts.
> npm sets `INIT_CWD` to where npm was invoked, and Shopify CLI reads that over a `cd`,
> causing a false "not in a theme directory" warning + "Failed to delete" errors.
> `--path` makes the theme dir explicit and npm-proof. Simplest: use `npm run dev`.

## Hot-reload dev server (live edits, no re-push)

```bash
npm run dev          # or: npm start  (auto-kills any stale server first)

# equivalent raw command (from repo root):
shopify theme dev --path ./fazarim-theme --store fazarim-cosmetics.myshopify.com --store-password deotra
```

- Opens `http://127.0.0.1:9292`
- Save a file → browser hot-reloads instantly
- Uses a throwaway dev theme, does NOT touch "Fazarim Custom"
- Keys while running: `t` open preview · `e` theme editor · `q` quit

## Stop the dev server

```bash
npm run stop
```

## Push a deploy to the custom theme

```bash
npm run push

# one file only (fast), raw:
shopify theme push --path ./fazarim-theme --store fazarim-cosmetics.myshopify.com --theme 160480395477 --only config/settings_data.json
```

## First push of a brand-new theme (draft)

```bash
npm run push:new
```

## Pull remote changes back to local (if edited in admin)

```bash
npm run pull
```

## Publish (make it live — only when client-ready)

```bash
npm run publish
```

## Auth

```bash
npm run logout       # switch account
# next theme command triggers device-code browser login → log in as ceo@fazarim.com
```

## Preview links

- Live preview: `https://fazarim-cosmetics.myshopify.com?preview_theme_id=160480395477`
- Local hot-reload: `http://127.0.0.1:9292`
- Store gate: password `deotra` (Admin → Online Store → Preferences → Password protection)
