# Brand Reference — Fazarim

What the theme implements, and why. Source documents live with the client:

| document | what it governs |
|----------|-----------------|
| `Fazarim Brand Guidelines 2.pdf` (33pp) | logo, colour, typography, patterns |
| `Software Requirements Specification (SRS).pdf` (88pp) | sitemap, navigation, homepage sections, SEO, features |

Section 10 of the SRS (Design Requirements) is **empty headings only** — 10.1 through
10.6 have no content. The brand PDF is therefore the sole design authority.

---

## Fazarim is not a makeup brand

> "a premium personal care brand specializing in **skincare, hair care, and body care**" — SRS §1.2
>
> "bathing soaps, medicated soaps, hair oils, moisturizing lotions, serums, sulphate-free
> shampoos, medicated shampoos" — SRS §2.1

No foundation, no lipstick, no mascara, no nail polish. The first-pass catalog in this repo
assumed cosmetics and was wrong; it has been rebuilt. **Do not reintroduce makeup categories.**

---

## Colour

The guidelines offer three palette options (pp. 9–11), which reads as an open choice.
It isn't. Sampling the logo PNG's pixels:

```text
#A64D79   49223 px   → Option 1 PRIMARY
#848484    4147 px   → Option 1 TERTIARY
#6EC47C    1039 px   → Option 1 SECONDARY
```

Exact match to Option 1. Options 2 (`#2D547A` blue) and 3 (`#72655D` taupe) contain none
of the logo's colours — either would leave the logo permanently off-palette.
**Option 1 is the only coherent choice.**

| role | hex | use |
|------|-----|-----|
| Primary — mauve pink | `#A64D79` | buttons, links, headings, feature backgrounds |
| Secondary — green | `#6EC47C` | accent backgrounds **only** — see contrast below |
| Tertiary — grey | `#848484` | large text, rules, muted detail |
| Black | `#000000` | body text, footer background |
| White | `#FFFFFF` | page background |
| Custom 1/2/3 | `#5B5B5B` `#A0A0A0` `#DBDBDB` | supporting greys |

### Contrast — two colours are traps

SRS §9.7 mandates WCAG 2.1. Measured against white:

| colour | ratio | verdict |
|--------|-------|---------|
| `#A64D79` | 5.30 | passes AA. Safe for buttons (white label) and links |
| `#6EC47C` | **2.13** | **fails.** Never text, never a white-label button. Background only, with black text (9.85 on black) |
| `#848484` | **3.74** | **fails for body text.** Large text only (≥24px, or ≥19px bold) |

The logo's own tagline is set in `#848484`. Fine at logo scale, not usable as body copy.

`scheme-5` is the green scheme and is deliberately configured with **black** text and a
black button. Do not "fix" it to white.

---

## Typography

Brand spec (Guidelines p.14):

| role | face | implemented as |
|------|------|----------------|
| Header | **Larken Bold** | ⚠️ **Playfair Display Bold** — stand-in, see below |
| Sub-header | Larken Regular, uppercase | `.brand-subhead` in `fazarim-custom.css` |
| Body | **Outfit Light** | ✅ `outfit_n3` — exact match |
| Link | Larken Regular | inherits heading family |
| Buttons | **Outfit SemiBold**, uppercase, pill | ✅ `buttons_radius: 40` + weight 600 |

### Larken is not licensed

Larken is a commercial font by Ellen Luff. It is **not on Google Fonts** (`fonts.googleapis.com`
returns HTTP 400) and not in Shopify's font library. A **webfont licence is separate from the
desktop licence** the designer used to produce the PDF — owning one does not grant the other.

Playfair Display stands in: a free, high-contrast display serif with a comparable feel,
available natively through Shopify's font picker.

**To switch once a licence is confirmed:** set `type_header_font` in
`config/settings_data.json`. Nothing in the CSS names the face, so that is the only change.
If the client supplies `.woff2` files instead, add an `@font-face` in `fazarim-custom.css`
and override `--font-heading-family` — that file loads after Dawn's inline `:root` block,
so it wins.

### Outfit weights

Shopify serves Outfit at `n3` / `n6` / `n7`. The body face is Light (300), so weight 600
would otherwise synthesise — `theme.liquid` loads it explicitly:

```liquid
assign body_font_semibold = settings.type_body_font | font_modify: 'weight', '600'
```

---

## Logo

Source: `Fazarim-Logo-for-Social-Media.zip`. Working copies in [brand/](brand/).

Both source PNGs are 1080×1080 with the artwork floating in transparent padding — the full
logo occupies only **914×172**, so 84% of the canvas is empty. Setting the raw file as the
header logo renders the wordmark tiny. `brand/*.png` are trimmed to the alpha bounding box.

Upload with `npm run setup:logo` (staged upload — local files can't use `fileCreate`'s
`originalSource`).

**Gaps:** no SVG, and no horizontal-only lockup. The artwork is mauve-on-transparent, so it
needs a light backdrop — the header is on `scheme-1` (white). Moving the header to `scheme-4`
(black) would make the logo vanish; that needs a white variant from the client.

---

## Tagline — "REZULTS" is deliberate

The logo artwork reads **"PURE CARE. REAL REZULTS"**. Both PDFs say "RESULTS" every time
(zero occurrences of "REZULTS" in either document's text).

**Client confirmed the Z is intentional styling** (2026-07-16). Site copy follows the logo.

> Do not "correct" this to RESULTS. It is not a typo, it is a decision.

Flagged once for the record: a deliberate misspelling reads as an error to most customers,
which is a real risk for a brand whose trust points are "Clinically Tested" and
"Dermatologist Approved". The client owns that call.

---

## Homepage — SRS §8.1

Specified order, top to bottom:

| # | section | SRS | built |
|---|---------|-----|-------|
| 1 | Announcement Bar | §8.1.4 | ✅ `header-group.json` |
| 2 | Header & Navigation | §8.1.5 | ✅ mega menu, sticky, logo left |
| 3 | Hero Banner Slider — **3 slides** | §8.1.6 | ✅ placeholder imagery |
| 4 | Why Choose Fazarim — 4–6 trust cards | §8.1.7 | ✅ 6 cards |
| 5 | Shop by Category — **3 only** | §8.1.8 | ✅ Skincare / Hair Care / Body Care |
| 6 | Sale | §8.1.9 | ✅ |
| 7 | New Arrivals | §8.1.10 | ✅ |
| 8 | Best Sellers | §8.1.11 | ✅ |
| 9 | Shop by Skin Concern | §8.1.12 | ✅ 10 concern tiles |
| 10 | Customer Reviews | §8.1.13 | ❌ **not built — deliberate** |
| 11 | Footer — 6 columns + newsletter | §8.1.14 | ⚠️ 3 columns |

### Why Customer Reviews is not built

SRS §8.1.13 asks for a testimonial carousel with customer names, photos, star ratings and
review text. The store has **no customers and no reviews**. Building the section means
inventing testimonials — fabricated social proof for a brand selling on "Clinically Tested".

This needs either real reviews or a reviews app (Judge.me, Loox, Shopify Product Reviews)
that collects them from real orders. Dawn has no native reviews section.

### Trust points are claims

"Dermatologist Approved" and "Clinically Tested" come from SRS §8.1.7 — the client's own
assertions about their own products. Implemented as specified. The client must be able to
substantiate them; they are regulated claims in most markets.

---

## Navigation — SRS §6.2

```text
Sale · Skincare · Hair Care · Body Care · Best Sellers · Kits & Bundles · Fazarim Academy
```

**Fazarim Academy is deliberately absent from the built menu.** SRS §6.1 defines it as
educational videos, skin/hair guides, doctor consultations and downloadable resources —
none of which exist. Linking it would 404. Add to `data/store-structure.json` once the
pages exist.

Product URLs use Shopify's `/collections/<handle>` and `/products/<handle>`. The SRS §6.3
examples (`/skincare/serums`, `/academy`) are **not achievable on Shopify** without an
app or reverse proxy — Shopify's URL structure is fixed. Flag to the client.

---

## Deviations from the source documents

| # | spec | built | why |
|---|------|-------|-----|
| 1 | Tagline "RESULTS" (both PDFs) | "REZULTS" (logo) | Client confirmed logo spelling wins |
| 2 | Larken Bold headers | Playfair Display Bold | No webfont licence |
| 3 | Free shipping over **Rs. 10,000** (§8.1.4) | Banner says Rs 10,000 | ⚠️ **live shipping rate still Rs 5,000 — must be changed in Admin** |
| 4 | URL `/skincare/serums` (§6.3) | `/collections/serums` | Shopify's URL structure is fixed |
| 5 | Customer Reviews (§8.1.13) | not built | Would require fabricated testimonials |
| 6 | 6-column footer (§8.1.14) | 3 columns | Most target pages don't exist yet |
| 7 | Fazarim Academy nav (§6.2) | omitted | No pages built; would 404 |
