import test from 'node:test';
import assert from 'node:assert/strict';

import { makeHandleSTACObject } from '../../crawlingEngine/crawler_functions.js';

function makeLogger() {
  return {
    infoCalls: [],
    warnCalls: [],
    info(msg) { this.infoCalls.push(String(msg)); },
    warn(msg) { this.warnCalls.push(String(msg)); }
  };
}

function makeValidCollection({
  id = 'col-1',
  updated = '2026-02-01T00:00:00Z',
  href = 'https://example.com/col.json'
} = {}) {
  return {
    type: 'Collection',
    stac_version: '1.0.0',
    id,
    title: 'C1',
    description: 'A collection',
    license: 'proprietary',
    extent: {
      spatial: { bbox: [[-180, -90, 180, 90]] },
      temporal: { interval: [['2020-01-01T00:00:00Z', null]] }
    },
    updated,
    properties: { updated },
    links: [{ rel: 'self', href }]
  };
}

test('makeHandleSTACObject: invalid STAC object => returns undefined', async () => {
  const logger = makeLogger();
  let upsertSourceCalls = 0;
  let upsertCollectionCalls = 0;

  const handle = makeHandleSTACObject({
    validateStacObject: () => ({ valid: false }),
    upsertSource: async () => { upsertSourceCalls++; return 1; },
    upsertCollection: async () => { upsertCollectionCalls++; },
    logger
  });

  const result = await handle({ type: 'Catalog' }, 'https://example.com/root.json', null);

  assert.equal(result, undefined);
  assert.equal(upsertSourceCalls, 0);
  assert.equal(upsertCollectionCalls, 0);
  assert.ok(logger.warnCalls.length >= 1);
});

test('makeHandleSTACObject: Catalog => upsertSource + returns child URLs', async () => {
  const logger = makeLogger();
  const upsertSourceArgs = [];

  const handle = makeHandleSTACObject({
    validateStacObject: () => ({ valid: true }),
    upsertSource: async (data) => { upsertSourceArgs.push(data); return 10; },
    getChildURLs: () => [{ title: 'child', url: 'https://example.com/child.json' }],
    logger
  });

  const catalog = {
    type: 'Catalog',
    stac_version: '1.0.0',
    id: 'cat-1',
    title: 'Root',
    description: 'A catalog',
    links: [{ rel: 'self', href: 'https://example.com/root.json' }]
  };

  const result = await handle(catalog, 'https://example.com/root.json', null);

  assert.deepEqual(result, [{ title: 'child', url: 'https://example.com/child.json' }]);
  assert.equal(upsertSourceArgs.length, 1);
  assert.deepEqual(upsertSourceArgs[0], {
    url: 'https://example.com/root.json',
    title: 'Root',
    type: 'Catalog'
  });
});

test('makeHandleSTACObject: Collection with parentUrl => uses getSourceIdByUrl(parentUrl) as source_id and upserts when newer', async () => {
  const logger = makeLogger();
  const upsertCollectionArgs = [];
  const getSourceIdCalls = [];

  const handle = makeHandleSTACObject({
    validateStacObject: () => ({ valid: true }),
    upsertSource: async () => 111, 
    getSourceIdByUrl: async (url) => { getSourceIdCalls.push(url); return 222; },
    getLastCrawledTimestamp: async () => '2026-01-01T00:00:00Z',
    upsertCollection: async (data) => { upsertCollectionArgs.push(data); },
    getChildURLs: () => [],
    logger
  });

  const collection = makeValidCollection({ updated: '2026-02-01T00:00:00Z' });

  await handle(collection, 'https://example.com/col.json', 'https://example.com/parent.json');

  assert.deepEqual(getSourceIdCalls, ['https://example.com/parent.json']);
  assert.equal(upsertCollectionArgs.length, 1);
  assert.equal(upsertCollectionArgs[0].source_id, 222);
});

test('makeHandleSTACObject: Collection with parentUrl but parent not resolvable => upserts with source_id null and warns', async () => {
  const logger = makeLogger();
  const upsertCollectionArgs = [];

  const handle = makeHandleSTACObject({
    validateStacObject: () => ({ valid: true }),
    upsertSource: async () => 111,
    getSourceIdByUrl: async () => null,
    getLastCrawledTimestamp: async () => null,
    upsertCollection: async (data) => { upsertCollectionArgs.push(data); },
    getChildURLs: () => [],
    logger
  });

  await handle(makeValidCollection(), 'https://example.com/col.json', 'https://example.com/parent.json');

  assert.equal(upsertCollectionArgs.length, 1);
  assert.equal(upsertCollectionArgs[0].source_id, null);
  assert.ok(logger.warnCalls.some(m => m.includes('Could not resolve parent source id')));
});

test('makeHandleSTACObject: Collection root (parentUrl null) => uses currentSourceId as source_id', async () => {
  const logger = makeLogger();
  const upsertCollectionArgs = [];

  const handle = makeHandleSTACObject({
    validateStacObject: () => ({ valid: true }),
    upsertSource: async () => 999,
    getLastCrawledTimestamp: async () => null,
    upsertCollection: async (data) => { upsertCollectionArgs.push(data); },
    getChildURLs: () => [],
    logger
  });

  await handle(makeValidCollection(), 'https://example.com/col.json', null);

  assert.equal(upsertCollectionArgs.length, 1);
  assert.equal(upsertCollectionArgs[0].source_id, 999);
});

test('makeHandleSTACObject: incremental update => skips upsertCollection when updated <= lastCrawled', async () => {
  const logger = makeLogger();
  let upsertCollectionCalls = 0;

  const handle = makeHandleSTACObject({
    validateStacObject: () => ({ valid: true }),
    upsertSource: async () => 1,
    getLastCrawledTimestamp: async () => '2026-02-01T00:00:00Z',
    upsertCollection: async () => { upsertCollectionCalls++; },
    getChildURLs: () => [],
    logger
  });

  const collection = makeValidCollection({ updated: '2026-01-01T00:00:00Z' });
  await handle(collection, 'https://example.com/col.json', null);

  assert.equal(upsertCollectionCalls, 0);
  assert.ok(logger.infoCalls.some(m => m.includes('Skipping update')));
});

test('makeHandleSTACObject: valid but unsupported type => returns [] and does not upsert source/collection', async () => {
  const logger = makeLogger();
  let upsertSourceCalls = 0;
  let upsertCollectionCalls = 0;

  const handle = makeHandleSTACObject({
    validateStacObject: () => ({ valid: true }),
    upsertSource: async () => { upsertSourceCalls++; return 1; },
    upsertCollection: async () => { upsertCollectionCalls++; },
    logger
  });

  const unsupported = { type: 'Feature' };
  unsupported.self = unsupported;

  const out = await handle(unsupported, 'https://example.com/item.json', null);

  assert.deepEqual(out, []);
  assert.equal(upsertSourceCalls, 0);
  assert.equal(upsertCollectionCalls, 0);
});