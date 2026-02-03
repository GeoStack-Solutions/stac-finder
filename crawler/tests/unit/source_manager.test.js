import test from 'node:test';
import assert from 'node:assert/strict';

import { pool } from '../../data_management/db_client.js';
import {
  loadSources,
  loadValidSources,
  loadUncrawledSources,
  loadSourcesForCrawling,
  markSourceCrawled,
  isInSources
} from '../../sourceManager/source_manager.js';

function withStubbedPoolQuery(stubFn, fn) {
  const original = pool.query;
  pool.query = stubFn;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      pool.query = original;
    });
}

test('source_manager: loadSources returns rows from DB query', async () => {
  await withStubbedPoolQuery(
    async (text) => {
      assert.match(String(text), /FROM stac\.sources/i);
      return { rows: [{ id: 1, url: 'https://example.com', type: 'Catalog' }], rowCount: 1 };
    },
    async () => {
      const out = await loadSources();
      assert.deepEqual(out, [{ id: 1, url: 'https://example.com', type: 'Catalog' }]);
    }
  );
});

test('source_manager: loadValidSources filters invalid URL/type', async () => {
  await withStubbedPoolQuery(
    async () => ({
      rows: [
        { id: 1, url: 'https://example.com/a', type: 'Catalog', last_crawled_timestamp: null },
        { id: 2, url: 'not a url', type: 'Catalog', last_crawled_timestamp: null },
        { id: 3, url: 'https://example.com/b', type: null, last_crawled_timestamp: null }
      ],
      rowCount: 3
    }),
    async () => {
      const out = await loadValidSources();
      assert.equal(out.length, 1);
      assert.equal(out[0].id, 1);
    }
  );
});

test('source_manager: loadUncrawledSources returns only sources with null/empty last_crawled_timestamp', async () => {
  await withStubbedPoolQuery(
    async () => ({
      rows: [
        { id: 1, url: 'https://example.com/a', type: 'Catalog', last_crawled_timestamp: null },
        { id: 2, url: 'https://example.com/b', type: 'Catalog', last_crawled_timestamp: '2025-01-01T00:00:00Z' }
      ],
      rowCount: 2
    }),
    async () => {
      const out = await loadUncrawledSources();
      assert.deepEqual(out.map((x) => x.id), [1]);
    }
  );
});

test('source_manager: loadSourcesForCrawling respects intervalDays (includes never-crawled + older-than-interval)', async () => {
  const now = Date.now();
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

  await withStubbedPoolQuery(
    async () => ({
      rows: [
        { id: 1, url: 'https://example.com/never', type: 'Catalog', last_crawled_timestamp: null },
        { id: 2, url: 'https://example.com/old', type: 'Catalog', last_crawled_timestamp: eightDaysAgo },
        { id: 3, url: 'https://example.com/recent', type: 'Catalog', last_crawled_timestamp: twoDaysAgo }
      ],
      rowCount: 3
    }),
    async () => {
      const out = await loadSourcesForCrawling(7);
      assert.deepEqual(out.map((x) => x.id).sort((a, b) => a - b), [1, 2]);
    }
  );
});

test('source_manager: markSourceCrawled issues UPDATE with id param', async () => {
  await withStubbedPoolQuery(
    async (text, params) => {
      assert.match(String(text), /UPDATE stac\.sources/i);
      assert.deepEqual(params, [123]);
      return { rows: [], rowCount: 1 };
    },
    async () => {
      await markSourceCrawled(123);
    }
  );
});

test('source_manager: isInSources returns true/false based on rowCount', async () => {
  await withStubbedPoolQuery(
    async () => ({ rows: [{ 1: 1 }], rowCount: 1 }),
    async () => {
      assert.equal(await isInSources('https://example.com/a'), true);
    }
  );

  await withStubbedPoolQuery(
    async () => ({ rows: [], rowCount: 0 }),
    async () => {
      assert.equal(await isInSources('https://example.com/a'), false);
    }
  );
});