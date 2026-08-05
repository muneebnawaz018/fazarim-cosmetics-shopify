#!/usr/bin/env node
/**
 * seed-products.mjs — extra dummy catalogue depth for Fazarim Cosmetics.
 *
 * The homepage carousels only grow arrows when a collection holds more products
 * than the grid shows (5 across). Sale had 2 and New Arrivals had 5, so neither
 * rendered as a carousel. This tops the catalogue up.
 *
 * Zero dependencies. Node 18+ (global fetch).
 * Credentials come from .shopify.env (gitignored, never logged).
 * Data lives in data/products.dummy.json — edit that, not this script.
 *
 *   node scripts/seed-products.mjs            create + retag
 *   node scripts/seed-products.mjs --dry-run  preview without writing
 *
 * Idempotent: skips any handle that already exists and any product already
 * tagged `sale`. Safe to re-run.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN = process.argv.includes('--dry-run');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

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
  env.SHOPIFY_API_VERSION ||= '2025-01';
  return env;
}

const ENV = await loadEnv();
const BASE = `https://${ENV.SHOPIFY_STORE}/admin/api/${ENV.SHOPIFY_API_VERSION}`;
const HEADERS = {
  'X-Shopify-Access-Token': ENV.SHOPIFY_ADMIN_TOKEN,
  'Content-Type': 'application/json',
};

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: HEADERS });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${path} — ${JSON.stringify(body.errors ?? body)}`);
  return body;
}

// ------------------------------------------------------------------- run

const data = JSON.parse(await readFile(join(ROOT, 'data/products.dummy.json'), 'utf8'));
const existing = (await api('/products.json?limit=250&fields=id,handle,tags')).products;
const byHandle = Object.fromEntries(existing.map((p) => [p.handle, p]));

let created = 0;
let retagged = 0;

for (const p of data.products) {
  if (byHandle[p.handle]) {
    console.log(`· exists   ${p.handle}`);
    continue;
  }
  if (DRY_RUN) {
    console.log(`+ would create ${p.handle} — Rs.${p.price}${p.compareAtPrice ? ` (was Rs.${p.compareAtPrice})` : ''} [${p.tags.join(', ')}]`);
    created++;
    continue;
  }
  const { product } = await api('/products.json', {
    method: 'POST',
    body: JSON.stringify({
      product: {
        title: p.title,
        handle: p.handle,
        body_html: `<p>${p.body}</p>`,
        vendor: data.vendor,
        product_type: p.type,
        tags: p.tags.join(', '),
        status: 'active',
        published_scope: 'web',
        images: [{ src: p.image, alt: p.title }],
        variants: [
          {
            price: p.price,
            compare_at_price: p.compareAtPrice,
            inventory_management: null,
            requires_shipping: true,
          },
        ],
      },
    }),
  });
  console.log(`+ created  ${p.handle} (${product.id})`);
  created++;
  await sleep(600);
}

for (const handle of data.retagAsSale) {
  const p = byHandle[handle];
  if (!p) {
    console.log(`· missing  ${handle}`);
    continue;
  }
  const tags = p.tags.split(',').map((s) => s.trim()).filter(Boolean);
  if (tags.includes('sale')) {
    console.log(`· tagged   ${handle}`);
    continue;
  }
  tags.push('sale');
  if (DRY_RUN) {
    console.log(`~ would tag ${handle} as sale`);
    retagged++;
    continue;
  }
  await api(`/products/${p.id}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: { id: p.id, tags: tags.join(', ') } }),
  });
  console.log(`~ tagged   ${handle} as sale`);
  retagged++;
  await sleep(600);
}

console.log(`\n${DRY_RUN ? '[dry run] ' : ''}${created} created, ${retagged} retagged.`);
