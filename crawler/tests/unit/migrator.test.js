import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeStacObject } from '../../crawlingEngine/migrator.js';

test('normalizeStacObject: migrates Catalog via catalog strategy and returns stacVersion', async () => {
  const input = {
    stac_version: '1.0.0',
    type: 'Catalog',
    id: 'root',
    description: 'Root catalog',
    links: [{ rel: 'self', href: 'https://example.com/catalog.json' }]
  };

  const out = await normalizeStacObject(input, 'https://example.com/catalog.json');

  assert.ok(out);
  assert.ok(out.collection);
  assert.equal(out.collection.type, 'Catalog');
  assert.equal(typeof out.stacVersion, 'string');
  assert.equal(out.stacVersion, out.collection.stac_version);
});

test('normalizeStacObject: migrates Collection via collection strategy and returns stacVersion', async () => {
  const input = {
    stac_version: '1.0.0',
    type: 'Collection',
    id: 'c1',
    description: 'A collection',
    license: 'proprietary',
    extent: {
      spatial: { bbox: [[-180, -90, 180, 90]] },
      temporal: { interval: [[null, null]] }
    },
    links: [{ rel: 'self', href: 'https://example.com/collections/c1' }]
  };

  const out = await normalizeStacObject(input, 'https://example.com/collections/c1');

  assert.ok(out);
  assert.ok(out.collection);
  assert.equal(out.collection.type, 'Collection');
  assert.equal(typeof out.stacVersion, 'string');
  assert.equal(out.stacVersion, out.collection.stac_version);
});

test('normalizeStacObject: output is decoupled from input (deep clone)', async () => {
  const input = {
    stac_version: '1.0.0',
    type: 'Catalog',
    id: 'root',
    description: 'Root catalog',
    links: [{ rel: 'self', href: 'https://example.com/catalog.json' }],
    nested: { a: 1 }
  };

  const out = await normalizeStacObject(input, 'https://example.com/catalog.json');

  out.collection.nested = { a: 999 };
  assert.deepEqual(input.nested, { a: 1 });
});

test('normalizeStacObject: throws and warns when JSON cloning fails', async () => {
  const circular = { type: 'Catalog', id: 'x', description: 'x', links: [] };
  circular.self = circular;

  const originalWarn = console.warn;
  const warns = [];
  console.warn = (msg) => warns.push(String(msg));

  try {
    await assert.rejects(
      () => normalizeStacObject(circular, 'https://example.com/circular'),
    );
    assert.ok(warns.some((m) => m.includes('Migration failed for https://example.com/circular')));
  } finally {
    console.warn = originalWarn;
  }
});