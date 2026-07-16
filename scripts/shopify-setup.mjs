#!/usr/bin/env node
/**
 * shopify-setup.mjs — store data automation for Fazarim Cosmetics.
 *
 * Zero dependencies. Node 18+ (global fetch).
 * Credentials come from .shopify.env (gitignored, never logged).
 *
 * Data lives in two files — edit those, not this script:
 *   data/store-structure.json  PERMANENT  collections + navigation
 *   data/assets.dummy.json     DUMMY      dev-only Unsplash imagery
 *
 * Swap in real imagery without touching structure:
 *   node scripts/shopify-setup.mjs images --assets data/assets.client.json
 *
 *   verify       check auth
 *   scopes       show granted vs needed API scopes, and live-probe them
 *   products     import from sample-products.dummy.csv
 *   tabs         per-product ingredients + how-to, as metafields
 *   collections  smart collections from structure rules
 *   copy         collection intro text + SEO meta descriptions
 *   images       attach product images (from the active assets file)
 *   covers       attach collection images (category + concern tiles)
 *   assets       upload hero/promo, patch index.json
 *   logo         upload brand/*.png, wire into theme settings
 *   pages        About Us / FAQ / Contact from content/*.html
 *   menus        build nested nav
 *   all          everything, in dependency order
 *
 *   prune        DELETE the off-brand handles listed under `retire` in
 *                store-structure.json. Irreversible; never part of `all`.
 *
 * Add --dry-run to any command to preview without writing.
 * Idempotent: re-running skips whatever already exists.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN = process.argv.includes('--dry-run');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ config

async function loadEnv() {
  let raw;
  try {
    raw = await readFile(join(ROOT, '.shopify.env'), 'utf8');
  } catch {
    fail('.shopify.env not found. Copy .shopify.env.example and fill it in.');
  }
  const env = Object.fromEntries(
    raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
  for (const key of ['SHOPIFY_STORE', 'SHOPIFY_ADMIN_TOKEN']) {
    if (!env[key]) fail(`${key} missing from .shopify.env`);
  }
  if (/x{8,}/i.test(env.SHOPIFY_ADMIN_TOKEN)) {
    fail('SHOPIFY_ADMIN_TOKEN is still the placeholder — paste your real shpat_ token.');
  }
  env.SHOPIFY_API_VERSION ||= '2025-01';
  return env;
}

const fail = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

/** `--assets <path>` selects the imagery file; defaults to the dev dummies. */
function assetsPath() {
  const i = process.argv.indexOf('--assets');
  return i !== -1 && process.argv[i + 1]
    ? join(ROOT, process.argv[i + 1])
    : join(ROOT, 'data', 'assets.dummy.json');
}

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

const ENV = await loadEnv();
const STRUCTURE = await readJson(join(ROOT, 'data', 'store-structure.json'));
const ASSETS = await readJson(assetsPath());
const BASE = `https://${ENV.SHOPIFY_STORE}/admin/api/${ENV.SHOPIFY_API_VERSION}`;

/** Namespace Shopify File `alt` text so uploads stay idempotent across assets files. */
const altFor = (key) => `fazarim-${key}`;

/** `$`-prefixed keys are inline docs in the JSON, not data. */
const dataEntries = (obj) => Object.entries(obj ?? {}).filter(([k]) => !k.startsWith('$'));

// -------------------------------------------------------------------- http

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': ENV.SHOPIFY_ADMIN_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    await sleep(2000);
    return api(path, { method, body });
  }
  if (!res.ok) fail(`HTTP ${res.status} ${method} ${path}\n${(await res.text()).slice(0, 400)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function gql(query, variables = {}) {
  const { data, errors } = await api('graphql.json', { method: 'POST', body: { query, variables } });
  if (errors) fail(`GraphQL\n${JSON.stringify(errors, null, 2)}`);
  return data;
}

// ---------------------------------------------------------------- commands

async function verify() {
  const { shop } = await api('shop.json');
  const { count } = await api('products/count.json');
  const { shop: gqlShop } = await gql('{ shop { name } }');
  console.log(`connected: ${shop.name} (${shop.myshopify_domain})`);
  console.log(`  plan:     ${shop.plan_display_name}`);
  console.log(`  currency: ${shop.currency}`);
  console.log(`  products: ${count}`);
  console.log(`  graphql:  ok (${gqlShop.name})`);
}

/*
  The scope plan. Keep in step with SHOPIFY_PROJECT_NOTES.md.

  `probe` is a real read that Shopify rejects without the scope. It exists because the docs
  cannot be trusted on this point and introspection proves nothing:
    - the schema lists all 452 mutations regardless of what the token holds;
    - `shopPolicyUpdate` needs `write_legal_policies`, which is absent from Shopify's own
      scope list;
    - `write_shipping` is documented as "DeliveryCarrierService objects", yet it is what
      `deliveryProfileUpdate` wants ("Requires any of `shipping` access scopes").
  Only a live call settles it.

  `tier`: have | needed | later | never
*/
const SCOPE_PLAN = [
  // --- held today
  { tier: 'have',   scope: 'read_products',                 for: 'products, collections',            probe: 'products(first:1){nodes{id}}' },
  { tier: 'have',   scope: 'write_products',                for: 'create/update products',           probe: null },
  { tier: 'have',   scope: 'read_files',                    for: 'Shopify Files',                    probe: 'files(first:1){nodes{id}}' },
  { tier: 'have',   scope: 'write_files',                   for: 'image + logo upload',              probe: null },
  { tier: 'have',   scope: 'read_online_store_navigation',  for: 'menus',                            probe: 'menus(first:1){nodes{id}}' },
  { tier: 'have',   scope: 'write_online_store_navigation', for: 'build the nav tree',               probe: null },

  // --- certain need, per the SRS
  { tier: 'needed', scope: 'read_content',                  for: 'About/FAQ/Contact, Blog, Academy', probe: 'pages(first:1){nodes{id}}' },
  { tier: 'needed', scope: 'write_content',                 for: 'create those pages + articles',    probe: null },
  { tier: 'needed', scope: 'read_legal_policies',           for: 'read current policies',            probe: 'shop{shopPolicies{type}}' },
  { tier: 'needed', scope: 'write_legal_policies',          for: 'the 4 drafts in docs/policies/',   probe: null },
  { tier: 'needed', scope: 'read_shipping',                 for: 'delivery profiles',                probe: 'deliveryProfiles(first:1){nodes{id}}' },
  { tier: 'needed', scope: 'write_shipping',                for: 'the free-shipping threshold',      probe: null },
  { tier: 'needed', scope: 'read_discounts',                for: 'promos (SRS FAQ 17)',              probe: 'discountNodes(first:1){nodes{id}}' },
  { tier: 'needed', scope: 'write_discounts',               for: 'create promo codes',               probe: null },
  // No probe: `inventoryItems` reads fine under read_products, so it cannot isolate this scope.
  // Only a write proves it, and that is not something to fire off as a check.
  { tier: 'needed', scope: 'read_inventory',                for: 'stock levels',                     probe: null },
  { tier: 'needed', scope: 'write_inventory',               for: 'set stock on real products',       probe: null },
  { tier: 'needed', scope: 'read_locations',                for: 'the fake Toronto / Snow City locations', probe: 'locations(first:1){nodes{id}}' },
  { tier: 'needed', scope: 'write_locations',               for: 'deactivate them',                  probe: null },
  { tier: 'needed', scope: 'read_orders',                   for: 'order data — PII, see notes',      probe: 'orders(first:1){nodes{id}}' },
  { tier: 'needed', scope: 'read_customers',                for: 'customer data — PII, see notes',   probe: 'customers(first:1){nodes{id}}' },

  // --- only once the Academy is real
  { tier: 'later',  scope: 'read_metaobjects',              for: 'Academy structured content',       probe: 'metaobjectDefinitions(first:1){nodes{id}}' },
  { tier: 'later',  scope: 'write_metaobjects',             for: 'create Academy entries',           probe: null },
  { tier: 'later',  scope: 'read_metaobject_definitions',   for: 'Academy content types',            probe: null },
  { tier: 'later',  scope: 'write_metaobject_definitions',  for: 'define those types',               probe: null },
];

/* Deliberately NOT requested. Recorded so nobody "helpfully" ticks them later. */
const SCOPE_REFUSED = [
  ['write_customers', 'edits real customer records — no script needs it'],
  ['write_orders', 'creates/modifies real orders — a bug here is unrecoverable'],
  ['read_all_orders', 'beyond the 60-day window; needs Shopify approval'],
  ['payment_*', 'for payment app developers, not merchants'],
  ['read_users', 'Shopify Plus only'],
  ['*_fulfillment_orders', 'only if the client adopts a 3PL'],
  ['read_themes / write_themes', 'the CLI already handles themes with its own auth'],
];

/** Reports granted vs planned scopes, and live-probes each to prove it. */
async function scopes() {
  const { access_scopes } = await api('../../oauth/access_scopes.json');
  const granted = new Set(access_scopes.map((s) => s.handle));
  const LABEL = { have: 'already held', needed: 'TICK THESE — certain need', later: 'later — only if the Academy gets built' };

  console.log(`app "fazarim" holds ${granted.size} scope(s)`);
  for (const tier of ['have', 'needed', 'later']) {
    console.log(`\n${LABEL[tier]}:`);
    for (const { scope, for: why } of SCOPE_PLAN.filter((s) => s.tier === tier)) {
      console.log(`  ${granted.has(scope) ? '✅' : '❌'}  ${scope.padEnd(28)} ${why}`);
    }
  }

  const extra = [...granted].filter((g) => !SCOPE_PLAN.some((s) => s.scope === g));
  if (extra.length) {
    console.log(`\n⚠️  granted but NOT in the plan: ${extra.join(', ')}`);
    console.log('    Untick unless there is a reason — every scope widens what a leaked token costs.');
  }

  console.log('\nlive probes (the docs are wrong often enough to warrant this):');
  for (const { scope, probe } of SCOPE_PLAN.filter((s) => s.probe)) {
    const res = await api('graphql.json', { method: 'POST', body: { query: `{ ${probe} }` } })
      .catch(() => ({ errors: [{ extensions: { code: 'HTTP_ERROR' } }] }));
    const denied = JSON.stringify(res.errors ?? '').includes('ACCESS_DENIED');
    console.log(`  ${denied ? 'DENIED  ' : 'ok      '} ${scope}`);
  }

  console.log('\nnever request:');
  for (const [s, why] of SCOPE_REFUSED) console.log(`  ${s.padEnd(24)} ${why}`);

  const missing = SCOPE_PLAN.filter((s) => s.tier === 'needed' && !granted.has(s.scope)).map((s) => s.scope);
  if (missing.length) {
    console.log(`\nto add (${missing.length}):\n  ${missing.join('\n  ')}`);
    console.log('\nhttps://admin.shopify.com/store/fazarim-cosmetics/settings/apps/development');
    console.log('  fazarim → Configuration → Admin API integration → Edit → tick → Save → Update app');
    console.log('Then re-run `npm run scopes`. On HTTP 401 the token rotated — copy the new one');
    console.log('from the API credentials tab into .shopify.env.');
  } else {
    console.log('\nall needed scopes granted.');
  }
}

/** Minimal RFC-4180 CSV parser — handles quoted fields with commas and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

async function csvProducts() {
  const rows = parseCsv(await readFile(join(ROOT, 'sample-products.dummy.csv'), 'utf8'));
  const byHandle = new Map();
  for (const row of rows) {
    const handle = row.Handle?.trim();
    if (handle) byHandle.set(handle, [...(byHandle.get(handle) ?? []), row]);
  }
  return [...byHandle].map(([handle, group]) => {
    const head = group.find((r) => r.Title?.trim()) ?? group[0];
    const variants = group
      .filter((r) => r['Variant Price']?.trim())
      .map((r) => ({
        option1: r['Option1 Value']?.trim() || 'Default Title',
        price: r['Variant Price'].trim(),
        ...(r['Variant Compare At Price']?.trim() && { compare_at_price: r['Variant Compare At Price'].trim() }),
        sku: r['Variant SKU']?.trim() ?? '',
        inventory_management: 'shopify',
        inventory_policy: r['Variant Inventory Policy']?.trim() || 'deny',
        requires_shipping: (r['Variant Requires Shipping'] ?? 'true').toLowerCase() === 'true',
        taxable: (r['Variant Taxable'] ?? 'true').toLowerCase() === 'true',
      }));
    return {
      handle,
      title: head.Title?.trim() ?? '',
      body_html: head['Body (HTML)']?.trim() ?? '',
      vendor: head.Vendor?.trim() || 'Fazarim',
      product_type: head.Type?.trim() ?? '',
      tags: head.Tags?.trim() ?? '',
      status: (head.Status?.trim() || 'active').toLowerCase(),
      options: [{ name: head['Option1 Name']?.trim() || 'Title' }],
      variants: variants.length ? variants : [{ option1: 'Default Title', price: '0.00' }],
    };
  });
}

/** Walk REST cursor pagination via the Link header. */
async function paginate(path, key) {
  const out = [];
  let url = `${BASE}/${path}`;
  while (url) {
    const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': ENV.SHOPIFY_ADMIN_TOKEN } });
    if (!res.ok) fail(`HTTP ${res.status} GET ${url}`);
    out.push(...((await res.json())[key] ?? []));
    const next = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get('link') ?? '');
    url = next?.[1] ?? null;
  }
  return out;
}

const METAFIELDS_SET = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) { userErrors { field message } }
  }`;

/*
  Per-product tab content.

  Dawn's `collapsible_tab` renders `block.settings.content` — one static string for every
  product in the catalog, which had the soap and shampoo pages both telling customers to
  "apply to clean skin". Ingredient disclosure is not decoration on cosmetics: the Terms
  draft leans on ingredients being "correctly listed on the product".

  So the tabs read product metafields instead (see sections/main-product.liquid).
*/
async function tabs() {
  const rows = parseCsv(await readFile(join(ROOT, 'sample-products.dummy.csv'), 'utf8'));
  const wanted = rows.filter((r) => r.Handle?.trim() && (r.Ingredients?.trim() || r['How To Use']?.trim()));
  const { products: live } = await gql('{ products(first: 100) { nodes { id handle } } }');
  const byHandle = new Map(live.nodes.map((p) => [p.handle, p.id]));

  const metafields = [];
  for (const r of wanted) {
    const id = byHandle.get(r.Handle.trim());
    if (!id) { console.log(`  warn    ${r.Handle} not on store (run products first)`); continue; }
    for (const [key, value] of [['ingredients', r.Ingredients], ['how_to_use', r['How To Use']]]) {
      if (value?.trim()) {
        metafields.push({ ownerId: id, namespace: 'custom', key, type: 'multi_line_text_field', value: value.trim() });
      }
    }
  }

  if (DRY_RUN) {
    console.log(`[dry] would set ${metafields.length} metafield(s) across ${wanted.length} product(s)`);
    return;
  }

  // metafieldsSet caps at 25 per call.
  for (let i = 0; i < metafields.length; i += 25) {
    const { metafieldsSet } = await gql(METAFIELDS_SET, { metafields: metafields.slice(i, i + 25) });
    if (metafieldsSet.userErrors.length) fail(JSON.stringify(metafieldsSet.userErrors, null, 2));
    await sleep(300);
  }
  console.log(`done: ${metafields.length} metafield(s) set on ${wanted.length} product(s)`);
}

/** Tag lists are set-equal regardless of order or spacing. */
const sameTags = (a, b) => {
  const norm = (s) => [...new Set(String(s).split(',').map((t) => t.trim()).filter(Boolean))].sort().join('|');
  return norm(a) === norm(b);
};

async function products() {
  const existing = await paginate('products.json?limit=250&fields=id,handle,title,tags,product_type,body_html', 'products');
  const byHandle = new Map(existing.map((p) => [p.handle, p]));
  const wanted = await csvProducts();
  console.log(`${wanted.length} products in CSV, ${existing.length} already on store`);
  let created = 0;
  let updated = 0;
  for (const product of wanted) {
    const live = byHandle.get(product.handle);
    if (!live) {
      if (DRY_RUN) { console.log(`  [dry] create ${product.handle}`); created++; continue; }
      const { product: made } = await api('products.json', { method: 'POST', body: { product } });
      console.log(`  created ${made.handle.padEnd(32)} id=${made.id}`);
      created++;
      await sleep(300);
      continue;
    }
    /*
      Converge, don't just skip. Handles outlive their content — a product
      retagged in the CSV must be retagged on the store, or the tag-driven
      smart collections silently miss it. Variants and images are left alone:
      those are merchant-owned once live.
    */
    const drift = {};
    if (live.title !== product.title) drift.title = product.title;
    if (live.product_type !== product.product_type) drift.product_type = product.product_type;
    if (!sameTags(live.tags, product.tags)) drift.tags = product.tags;
    if ((live.body_html ?? '') !== product.body_html) drift.body_html = product.body_html;
    if (!Object.keys(drift).length) { console.log(`  ok      ${product.handle}`); continue; }
    if (DRY_RUN) { console.log(`  [dry] update ${product.handle.padEnd(30)} ${Object.keys(drift).join(', ')}`); updated++; continue; }
    await api(`products/${live.id}.json`, { method: 'PUT', body: { product: { id: live.id, ...drift } } });
    console.log(`  updated ${product.handle.padEnd(30)} ${Object.keys(drift).join(', ')}`);
    updated++;
    await sleep(300);
  }
  console.log(`done: ${created} created, ${updated} updated`);
}

async function collections() {
  const existing = new Set();
  for (const kind of ['smart_collections', 'custom_collections']) {
    const data = await api(`${kind}.json?limit=250&fields=handle`);
    (data[kind] ?? []).forEach((c) => existing.add(c.handle));
  }
  console.log(`${existing.size} collections already on store`);
  let made = 0;
  for (const { handle, title, rule } of STRUCTURE.collections) {
    if (existing.has(handle)) { console.log(`  skip    ${handle} (exists)`); continue; }
    if (DRY_RUN) { console.log(`  [dry] create ${handle.padEnd(14)} ${rule.column} == ${rule.condition}`); made++; continue; }
    const body = {
      smart_collection: {
        title, handle, disjunctive: false, published: true,
        rules: [{ column: rule.column, relation: 'equals', condition: rule.condition }],
      },
    };
    const { smart_collection: c } = await api('smart_collections.json', { method: 'POST', body });
    console.log(`  created ${c.handle.padEnd(14)} id=${c.id}  (${rule.column}==${rule.condition})`);
    made++;
    await sleep(300);
  }
  console.log(`done: ${made} collections created`);
}

async function images() {
  const all = await paginate('products.json?limit=250&fields=id,handle,images', 'products');
  const byHandle = new Map(all.map((p) => [p.handle, p]));
  console.log(`assets: ${ASSETS.label}`);
  let attached = 0;
  for (const [handle, src] of dataEntries(ASSETS.productImages)) {
    const product = byHandle.get(handle);
    if (!product) { console.log(`  warn    ${handle} not on store (run products first)`); continue; }
    if (product.images?.length) { console.log(`  skip    ${handle} (has image)`); continue; }
    if (DRY_RUN) { console.log(`  [dry] attach -> ${handle}`); attached++; continue; }
    await api(`products/${product.id}/images.json`, { method: 'POST', body: { image: { src } } });
    console.log(`  image   ${handle}`);
    attached++;
    await sleep(400);
  }
  console.log(`done: ${attached} images attached`);
  if (ASSETS.$warning) console.log(`\n⚠️  ${ASSETS.$warning}`);
}

const FILES_QUERY = `{ files(first: 100) { nodes { id fileStatus alt ... on MediaImage { image { url } } } } }`;
const FILE_CREATE = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) { files { id alt } userErrors { field message } }
  }`;

/** alt -> shopify://shop_images/<filename>, for every processed image. */
async function shopifyFiles() {
  const { files } = await gql(FILES_QUERY);
  const map = {};
  for (const node of files.nodes) {
    const url = node.image?.url;
    if (url && node.alt) map[node.alt] = `shopify://shop_images/${url.split('/').pop().split('?')[0]}`;
  }
  return map;
}

async function assets() {
  console.log(`assets: ${ASSETS.label}`);
  const keys = dataEntries(ASSETS.themeAssets).map(([k]) => k);
  let uploaded = await shopifyFiles();
  const todo = dataEntries(ASSETS.themeAssets).filter(([key]) => !(altFor(key) in uploaded));

  if (todo.length && DRY_RUN) {
    todo.forEach(([key]) => console.log(`  [dry] upload ${altFor(key)}`));
    console.log('[dry] would patch templates/index.json hero + promo');
    return;
  }
  if (todo.length) {
    const files = todo.map(([key, originalSource]) => ({ originalSource, contentType: 'IMAGE', alt: altFor(key) }));
    const { fileCreate } = await gql(FILE_CREATE, { files });
    if (fileCreate.userErrors.length) fail(JSON.stringify(fileCreate.userErrors, null, 2));
    console.log(`uploaded ${files.length} file(s), waiting for processing...`);
    for (let i = 0; i < 15; i++) {
      await sleep(2000);
      uploaded = await shopifyFiles();
      if (keys.every((k) => altFor(k) in uploaded)) break;
    }
  }
  const missing = keys.filter((k) => !(altFor(k) in uploaded));
  for (const key of keys) console.log(`  ${(missing.includes(key) ? 'pending' : 'ok').padEnd(8)} ${key}`);
  if (missing.length) return console.log('warn: still processing — re-run `assets` shortly');

  const path = join(ROOT, 'fazarim-theme', 'templates', 'index.json');
  const tpl = JSON.parse(await readFile(path, 'utf8'));
  const { hero, promo } = STRUCTURE.themeAssetTargets;
  const heroSection = tpl.sections[hero.section];
  heroSection.block_order.slice(0, hero.slides.length).forEach((id, i) => {
    heroSection.blocks[id].settings.image = uploaded[altFor(hero.slides[i])];
  });
  tpl.sections[promo.section].settings.image = uploaded[altFor(promo.asset)];
  await writeFile(path, `${JSON.stringify(tpl, null, 2)}\n`);
  console.log(`patched index.json: ${hero.slides.length} hero slide(s) + promo banner`);
  if (ASSETS.$warning) console.log(`\n⚠️  ${ASSETS.$warning}`);
}

/**
 * Deletes the handles listed under `retire` in store-structure.json.
 *
 * Deliberately NOT part of `all` — deletion is irreversible, so it stays an
 * explicit opt-in. Only ever touches handles named in the data file.
 */
async function prune() {
  const retire = STRUCTURE.retire ?? {};
  const liveProducts = await paginate('products.json?limit=250&fields=id,handle,title', 'products');
  const byHandle = new Map(liveProducts.map((p) => [p.handle, p]));

  const cols = {};
  for (const kind of ['smart_collections', 'custom_collections']) {
    for (const c of (await api(`${kind}.json?limit=250&fields=id,handle`))[kind] ?? []) {
      cols[c.handle] = { id: c.id, kind };
    }
  }

  const hitP = (retire.products ?? []).filter((h) => byHandle.has(h));
  const hitC = (retire.collections ?? []).filter((h) => h in cols);
  const goneP = (retire.products ?? []).filter((h) => !byHandle.has(h));
  const goneC = (retire.collections ?? []).filter((h) => !(h in cols));

  if (!hitP.length && !hitC.length) {
    console.log(`nothing to prune (${goneP.length + goneC.length} already gone)`);
    return;
  }
  console.log(`will DELETE ${hitP.length} product(s) and ${hitC.length} collection(s):`);
  hitP.forEach((h) => console.log(`  product     ${h}  (${byHandle.get(h).title})`));
  hitC.forEach((h) => console.log(`  collection  ${h}`));
  if (DRY_RUN) return console.log('\n[dry] nothing deleted');

  for (const h of hitP) {
    await api(`products/${byHandle.get(h).id}.json`, { method: 'DELETE' });
    console.log(`  deleted product     ${h}`);
    await sleep(300);
  }
  for (const h of hitC) {
    await api(`${cols[h].kind.replace(/s$/, '')}s/${cols[h].id}.json`, { method: 'DELETE' });
    console.log(`  deleted collection  ${h}`);
    await sleep(300);
  }
  console.log(`done: ${hitP.length} products, ${hitC.length} collections deleted`);
}

const PAGE_CREATE = `
  mutation pageCreate($page: PageCreateInput!) {
    pageCreate(page: $page) { page { id handle } userErrors { field message } }
  }`;
const PAGE_UPDATE = `
  mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
    pageUpdate(id: $id, page: $page) { page { id handle } userErrors { field message } }
  }`;

/**
 * Shopify pages — About Us, FAQ, Contact.
 *
 * Body HTML lives in content/*.html; data/pages.json is only the index. Copy is the client's
 * own, lifted from the SRS (§8.2 About, §8.5 FAQ, §8.6 Contact).
 *
 * Read `$conflictComment` in data/pages.json before trusting the FAQ: two of its answers are
 * not true of the store as it stands.
 */
async function pages() {
  const index = await readJson(join(ROOT, 'data', 'pages.json'));
  const { pages: live } = await gql('{ pages(first: 100) { nodes { id handle } } }');
  const byHandle = new Map(live.nodes.map((p) => [p.handle, p.id]));

  let made = 0;
  let updated = 0;
  for (const p of index.pages) {
    const body = await readFile(join(ROOT, p.file), 'utf8');
    /*
      Two things the input types do not do the obvious way:

      - `templateSuffix` is only sent when the index names one. Shopify's stock contact page
        carries templateSuffix "contact" -> templates/page.contact.json, which is what renders
        the actual contact form; sending null would silently drop it.
      - There is no `seo` field on PageCreateInput/PageUpdateInput (unlike CollectionInput).
        Page SEO is `global.title_tag` / `global.description_tag` metafields.
    */
    const seo = [
      ['title_tag', p.seoTitle],
      ['description_tag', p.seoDescription],
    ]
      .filter(([, v]) => v)
      .map(([key, value]) => ({ namespace: 'global', key, type: 'single_line_text_field', value }));

    const input = {
      title: p.title,
      handle: p.handle,
      body,
      isPublished: true,
      ...(p.templateSuffix !== undefined && { templateSuffix: p.templateSuffix }),
      ...(seo.length && { metafields: seo }),
    };
    const id = byHandle.get(p.handle);

    if (DRY_RUN) {
      console.log(`  [dry] ${id ? 'update' : 'create'} /pages/${p.handle.padEnd(12)} ${body.length} bytes`);
      id ? updated++ : made++;
      continue;
    }

    const res = id
      ? (await gql(PAGE_UPDATE, { id, page: input })).pageUpdate
      : (await gql(PAGE_CREATE, { page: input })).pageCreate;
    if (res.userErrors.length) fail(JSON.stringify(res.userErrors, null, 2));
    console.log(`  ${id ? 'updated' : 'created'} /pages/${p.handle}`);
    id ? updated++ : made++;
    await sleep(300);
  }
  console.log(`done: ${made} created, ${updated} updated`);
  if (index.$conflictComment) console.log(`\n⚠️  ${index.$conflictComment}`);
}

/**
 * Collection intro copy + meta descriptions.
 *
 * SRS §11.1 requires category pages to carry "optimized introductory content" and editable
 * meta descriptions. Every collection shipped with both empty, so the banner rendered
 * `<div class="collection-hero__description rte"></div>` — an empty box on every category page.
 */
async function copy() {
  const wanted = STRUCTURE.collections.filter((c) => c.description || c.seoDescription);
  if (!wanted.length) return console.log('no collection copy in store-structure.json');

  const { collections: live } = await gql(
    '{ collections(first: 100) { nodes { id handle description seo { description } } } }'
  );
  const byHandle = new Map(live.nodes.map((c) => [c.handle, c]));

  let set = 0;
  for (const c of wanted) {
    const l = byHandle.get(c.handle);
    if (!l) { console.log(`  warn    ${c.handle} not on store (run collections first)`); continue; }

    const drift = {};
    if (c.description && (l.description ?? '').trim() !== c.description) {
      drift.descriptionHtml = `<p>${c.description}</p>`;
    }
    if (c.seoDescription && (l.seo?.description ?? '') !== c.seoDescription) {
      drift.seo = { description: c.seoDescription };
    }
    if (!Object.keys(drift).length) { console.log(`  ok      ${c.handle}`); continue; }
    if (DRY_RUN) { console.log(`  [dry] copy ${c.handle.padEnd(22)} ${Object.keys(drift).join(', ')}`); set++; continue; }

    const { collectionUpdate } = await gql(COLLECTION_IMAGE_SET, { input: { id: l.id, ...drift } });
    if (collectionUpdate.userErrors.length) fail(JSON.stringify(collectionUpdate.userErrors));
    console.log(`  copy    ${c.handle.padEnd(22)} ${Object.keys(drift).join(', ')}`);
    set++;
    await sleep(300);
  }
  console.log(`done: ${set} collection(s) updated`);
}

const COLLECTION_IMAGE_SET = `
  mutation collectionUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) { collection { handle } userErrors { field message } }
  }`;

/**
 * Dawn's collection-list renders each collection's own featured image, so the
 * category tiles (SRS 8.1.8) and concern tiles (8.1.12) are driven from here,
 * not from theme settings.
 */
async function covers() {
  const wanted = dataEntries(ASSETS.collectionImages);
  if (!wanted.length) return console.log('no collectionImages in this assets file');
  console.log(`assets: ${ASSETS.label}`);

  const { collections: live } = await gql(
    '{ collections(first: 100) { nodes { id handle image { url } } } }'
  );
  const byHandle = new Map(live.nodes.map((c) => [c.handle, c]));
  let set = 0;
  for (const [handle, src] of wanted) {
    const c = byHandle.get(handle);
    if (!c) { console.log(`  warn    ${handle} not on store (run collections first)`); continue; }
    if (c.image?.url) { console.log(`  skip    ${handle} (has image)`); continue; }
    if (DRY_RUN) { console.log(`  [dry] cover -> ${handle}`); set++; continue; }
    const { collectionUpdate } = await gql(COLLECTION_IMAGE_SET, {
      input: { id: c.id, image: { src, altText: `Fazarim ${handle}` } },
    });
    if (collectionUpdate.userErrors.length) fail(JSON.stringify(collectionUpdate.userErrors));
    console.log(`  cover   ${handle}`);
    set++;
    await sleep(400);
  }
  console.log(`done: ${set} collection images set`);
  if (ASSETS.$warning) console.log(`\n⚠️  ${ASSETS.$warning}`);
}

const STAGED_CREATE = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }`;

/**
 * Real brand assets, unlike `assets` which pulls dummy imagery from a URL.
 * These are local files, so `fileCreate(originalSource:)` can't fetch them —
 * they go through a staged upload first.
 */
async function logo() {
  const LOGOS = [
    { key: 'logo', file: 'fazarim-logo.png', setting: 'logo' },
    { key: 'icon', file: 'fazarim-icon.png', setting: null },
  ];

  const uploaded = await shopifyFiles();
  const todo = LOGOS.filter((l) => !(altFor(l.key) in uploaded));

  if (DRY_RUN) {
    LOGOS.forEach((l) =>
      console.log(`  [dry] ${altFor(l.key) in uploaded ? 'skip  ' : 'upload'} ${l.file}`));
    console.log('[dry] would set settings_data.json -> logo');
    return;
  }

  for (const l of todo) {
    const bytes = await readFile(join(ROOT, 'brand', l.file));
    const { stagedUploadsCreate } = await gql(STAGED_CREATE, {
      input: [{ filename: l.file, mimeType: 'image/png', resource: 'FILE', httpMethod: 'POST' }],
    });
    if (stagedUploadsCreate.userErrors.length) fail(JSON.stringify(stagedUploadsCreate.userErrors));
    const target = stagedUploadsCreate.stagedTargets[0];

    const form = new FormData();
    for (const { name, value } of target.parameters) form.append(name, value);
    form.append('file', new Blob([bytes], { type: 'image/png' }), l.file);
    const put = await fetch(target.url, { method: 'POST', body: form });
    if (!put.ok) fail(`staged upload failed for ${l.file}: ${put.status}`);

    const { fileCreate } = await gql(FILE_CREATE, {
      files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt: altFor(l.key) }],
    });
    if (fileCreate.userErrors.length) fail(JSON.stringify(fileCreate.userErrors));
    console.log(`  upload  ${l.file}`);
  }

  let map = await shopifyFiles();
  for (let i = 0; i < 15 && !LOGOS.every((l) => altFor(l.key) in map); i++) {
    await sleep(2000);
    map = await shopifyFiles();
  }
  const missing = LOGOS.filter((l) => !(altFor(l.key) in map));
  if (missing.length) return console.log('warn: still processing — re-run `logo` shortly');

  const path = join(ROOT, 'fazarim-theme', 'config', 'settings_data.json');
  const data = JSON.parse(await readFile(path, 'utf8'));
  for (const l of LOGOS.filter((x) => x.setting)) {
    data.presets.Dawn[l.setting] = map[altFor(l.key)];
    console.log(`  set     ${l.setting} -> ${map[altFor(l.key)]}`);
  }
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

const MENU_QUERY = `{ menus(first: 20) { nodes { id handle } } }`;
const MENU_CREATE = `
  mutation menuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } }
  }`;
const MENU_UPDATE = `
  mutation menuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
    menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } }
  }`;

async function menus() {
  const { collections: cols } = await gql('{ collections(first: 100) { nodes { id handle } } }');
  const gid = Object.fromEntries(cols.nodes.map((n) => [n.handle, n.id]));

  /** An item is either a collection (resolved to a gid) or a literal url. */
  const toItem = ({ title, collection, url, type, items }) => {
    if (!collection) return { title, type: type || 'HTTP', url, ...(items?.length && { items: items.map(toItem) }) };
    const id = gid[collection];
    if (!id) console.log(`  warn: collection '${collection}' missing — '${title}' falls back to a URL link`);
    return {
      title,
      type: id ? 'COLLECTION' : 'HTTP',
      ...(id ? { resourceId: id } : { url: `/collections/${collection}` }),
      ...(items?.length && { items: items.map(toItem) }),
    };
  };

  const { menus: existing } = DRY_RUN ? { menus: { nodes: [] } } : await gql(MENU_QUERY);

  for (const menu of STRUCTURE.menus) {
    const items = menu.items.map(toItem);

    if (DRY_RUN) {
      console.log(`[dry] ${menu.handle}:`);
      for (const i of items) {
        console.log(`  ${i.title}`);
        i.items?.forEach((s) => console.log(`    └─ ${s.title}`));
      }
      continue;
    }

    const found = existing.nodes.find((m) => m.handle === menu.handle);
    const vars = { title: menu.title, handle: menu.handle, items };
    const result = found
      ? (await gql(MENU_UPDATE, { ...vars, id: found.id })).menuUpdate
      : (await gql(MENU_CREATE, vars)).menuCreate;
    if (result.userErrors.length) fail(JSON.stringify(result.userErrors, null, 2));

    console.log(`${menu.handle} ${found ? 'updated' : 'created'}: ${items.length} top-level items`);
    for (const i of items) console.log(`  ${i.title}${i.items ? ` (${i.items.length} sub)` : ''}`);
  }
}

// ------------------------------------------------------------------- entry

const COMMANDS = { verify, scopes, products, tabs, collections, copy, images, covers, assets, logo, pages, menus, prune };
const ORDER = ['verify', 'products', 'tabs', 'collections', 'copy', 'images', 'covers', 'assets', 'logo', 'pages', 'menus'];

const cmd = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'verify';
if (DRY_RUN) console.log('>>> DRY RUN — nothing will be written\n');

if (cmd === 'all') {
  for (const name of ORDER) {
    console.log(`\n=== ${name} ===`);
    await COMMANDS[name]();
  }
} else if (COMMANDS[cmd]) {
  await COMMANDS[cmd]();
} else {
  fail(`unknown command '${cmd}'. one of: ${Object.keys(COMMANDS).join(', ')}, all`);
}
