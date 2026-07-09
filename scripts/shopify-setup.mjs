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
 *   products     import from sample-products.csv
 *   collections  smart collections from structure rules
 *   images       attach product images (from the active assets file)
 *   assets       upload hero/promo, patch index.json
 *   menus        build nested nav
 *   all          everything, in dependency order
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
  const rows = parseCsv(await readFile(join(ROOT, 'sample-products.csv'), 'utf8'));
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

async function products() {
  const existing = new Set((await paginate('products.json?limit=250&fields=handle', 'products')).map((p) => p.handle));
  const wanted = await csvProducts();
  console.log(`${wanted.length} products in CSV, ${existing.size} already on store`);
  let created = 0;
  for (const product of wanted) {
    if (existing.has(product.handle)) { console.log(`  skip    ${product.handle} (exists)`); continue; }
    if (DRY_RUN) { console.log(`  [dry] create ${product.handle}`); created++; continue; }
    const { product: made } = await api('products.json', { method: 'POST', body: { product } });
    console.log(`  created ${made.handle.padEnd(32)} id=${made.id}`);
    created++;
    await sleep(300);
  }
  console.log(`done: ${created} created`);
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
  for (const [handle, src] of Object.entries(ASSETS.productImages)) {
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
  const keys = Object.keys(ASSETS.themeAssets);
  let uploaded = await shopifyFiles();
  const todo = Object.entries(ASSETS.themeAssets).filter(([key]) => !(altFor(key) in uploaded));

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

  const toItem = ({ title, collection, items }) => {
    const id = gid[collection];
    if (!id) console.log(`  warn: collection '${collection}' missing — '${title}' falls back to a URL link`);
    return {
      title,
      type: id ? 'COLLECTION' : 'HTTP',
      ...(id ? { resourceId: id } : { url: `/collections/${collection}` }),
      ...(items?.length && { items: items.map(toItem) }),
    };
  };
  const items = STRUCTURE.menu.items.map(toItem);

  if (DRY_RUN) {
    console.log(`[dry] ${STRUCTURE.menu.handle} structure:`);
    for (const i of items) {
      console.log(`  ${i.title}`);
      i.items?.forEach((s) => console.log(`    └─ ${s.title}`));
    }
    return;
  }

  const { menus: existing } = await gql(MENU_QUERY);
  const found = existing.nodes.find((m) => m.handle === STRUCTURE.menu.handle);
  const vars = { title: STRUCTURE.menu.title, handle: STRUCTURE.menu.handle, items };
  const result = found
    ? (await gql(MENU_UPDATE, { ...vars, id: found.id })).menuUpdate
    : (await gql(MENU_CREATE, vars)).menuCreate;
  if (result.userErrors.length) fail(JSON.stringify(result.userErrors, null, 2));

  console.log(`${STRUCTURE.menu.handle} ${found ? 'updated' : 'created'}: ${items.length} top-level items`);
  for (const i of items) console.log(`  ${i.title}${i.items ? ` (${i.items.length} sub)` : ''}`);
}

// ------------------------------------------------------------------- entry

const COMMANDS = { verify, products, collections, images, assets, menus };
const ORDER = ['verify', 'products', 'collections', 'images', 'assets', 'menus'];

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
