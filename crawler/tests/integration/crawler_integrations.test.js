import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import 'dotenv/config';

import pgPkg from 'pg';
const { Client } = pgPkg;

const enabled = process.env.CRAWLER_INTEGRATION === '1';

function hasDbEnv() {
  return Boolean(
    process.env.DB_HOST &&
      process.env.DB_PORT &&
      process.env.DB_USER &&
      process.env.DB_PASS &&
      process.env.DB_NAME
  );
}
test(
  'integration_test: crawl Catalog→Catalog→Collection (+ false STAC) twice, retry 500 once, then rollback',
  {
    skip: !enabled
      ? 'set CRAWLER_INTEGRATION=1 to run'
      : !hasDbEnv()
        ? 'set DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME to point to the existing DB'
        : false
  },
  async (t) => {
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const collectionIdRaw = `it/${runId}`;
    const expectedCollectionId = `it_${runId}`;

    let baseUrl = null;

    // Track HTTP hits to prove paths were/weren’t visited
    const hitsByPath = new Map();

    // Track retry path statuses (expect 500 then 200)
    const retryStatus = [];

    const hit = (pathname) => {
      hitsByPath.set(pathname, (hitsByPath.get(pathname) ?? 0) + 1);
    };

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      hit(url.pathname);

      // Root Catalog seeds: mid catalog + collection chain + false STAC + retry + broken URL
      if (url.pathname === `/it/${runId}/root/catalog.json`) {
        const body = {
          stac_version: '1.0.0',
          type: 'Catalog',
          id: `root-${runId}`,
          description: 'integration root catalog',
          links: [
            {
              rel: 'self',
              href: `${baseUrl}/it/${runId}/root/catalog.json`,
              type: 'application/json',
              title: 'root'
            },
            {
              rel: 'child',
              href: `${baseUrl}/it/${runId}/mid/catalog.json`,
              type: 'application/json',
              title: 'Mid Catalog'
            },
            {
              rel: 'child',
              href: `${baseUrl}/it/${runId}/false/stac.json`,
              type: 'application/json',
              title: 'False STAC'
            },
            // Invalid URL must be ignored by child extraction / queue validation
            { rel: 'child', href: 'http://[::1', title: 'Broken URL' },
            {
              rel: 'child',
              href: `${baseUrl}/it/${runId}/retry/catalog.json`,
              type: 'application/json',
              title: 'Retry Catalog'
            }
          ]
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
        return;
      }

      // Mid Catalog -> Collection
      if (url.pathname === `/it/${runId}/mid/catalog.json`) {
        const body = {
          stac_version: '1.0.0',
          type: 'Catalog',
          id: `mid-${runId}`,
          description: 'integration mid catalog',
          links: [
            {
              rel: 'self',
              href: `${baseUrl}/it/${runId}/mid/catalog.json`,
              type: 'application/json',
              title: 'mid'
            },
            {
              rel: 'parent',
              href: `${baseUrl}/it/${runId}/root/catalog.json`,
              type: 'application/json',
              title: 'root'
            },
            {
              rel: 'child',
              href: `${baseUrl}/it/${runId}/collections/c1.json`,
              type: 'application/json',
              title: 'C1'
            }
          ]
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
        return;
      }

      // False STAC: valid JSON, but validateStacObject(valid=false) => must not be stored
      if (url.pathname === `/it/${runId}/false/stac.json`) {
        const body = {
          hello: 'world',
          links: [{ rel: 'child', href: `${baseUrl}/it/${runId}/should-not-be-visited.json` }]
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
        return;
      }

      // Must never be requested (false STAC should not enqueue children)
      if (url.pathname === `/it/${runId}/should-not-be-visited.json`) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('should not be visited');
        return;
      }

      // Retry Catalog: first request returns 500, second returns 200
      if (url.pathname === `/it/${runId}/retry/catalog.json`) {
        const count = hitsByPath.get(url.pathname) ?? 0;

        if (count === 1) {
          retryStatus.push(500);
          res.writeHead(500, { 'content-type': 'text/plain' });
          res.end('temporary error');
          return;
        }

        retryStatus.push(200);
        const body = {
          stac_version: '1.0.0',
          type: 'Catalog',
          id: `retry-${runId}`,
          description: 'retry catalog',
          links: [
            {
              rel: 'self',
              href: `${baseUrl}/it/${runId}/retry/catalog.json`,
              type: 'application/json',
              title: 'retry'
            }
          ]
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
        return;
      }

      // Collection: should be stored with source_id resolved from parentUrl (mid catalog source)
      if (url.pathname === `/it/${runId}/collections/c1.json`) {
        const body = {
          stac_version: '1.0.0',
          type: 'Collection',
          id: collectionIdRaw,
          title: `Integration Collection ${runId}`,
          description: 'integration collection',
          license: 'proprietary',
          extent: {
            spatial: { bbox: [[-10, -10, 10, 10]] },
            temporal: { interval: [[null, null]] }
          },
          links: [
            {
              rel: 'self',
              href: `${baseUrl}/it/${runId}/collections/c1.json`,
              type: 'application/json',
              title: 'C1'
            },
            {
              rel: 'parent',
              href: `${baseUrl}/it/${runId}/mid/catalog.json`,
              type: 'application/json',
              title: 'mid'
            }
          ]
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
        return;
      }

      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const rootUrl = `${baseUrl}/it/${runId}/root/catalog.json`;
    const midUrl = `${baseUrl}/it/${runId}/mid/catalog.json`;
    const colUrl = `${baseUrl}/it/${runId}/collections/c1.json`;
    const falseUrl = `${baseUrl}/it/${runId}/false/stac.json`;
    const retryUrl = `${baseUrl}/it/${runId}/retry/catalog.json`;

    const { pool } = await import('../../data_management/db_client.js');
    const txClient = await pool.connect();
    const originalPoolQuery = pool.query;

    const checkClient = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    const crawlOnce = async () => {
      const { fetchWithRetry, handleSTACObject } = await import(
        '../../crawlingEngine/crawler_functions.js'
      );
      const { validateStacObject } = await import('../../validation/json_validator.js');
      const { validateQueueEntry } = await import('../../validation/queue_validator.js');
      const { addToQueue, getNextUrlFromDB, hasNextUrl, removeFromQueue } = await import(
        '../../queueManager/queue_manager.js'
      );

      // UrlQueue with a single root entry
      await addToQueue(['IT Root'], [rootUrl], [null]);

      let processed = 0;

      // Process until urlQueue is empty
      while (await hasNextUrl()) {
        const entry = await getNextUrlFromDB();
        assert.ok(entry);

        const urlToCrawl = entry.url_of_source;
        const parentUrl = entry.parent_url ?? null;

        // Guard: do not crawl outside fixture server
        if (!String(urlToCrawl).startsWith(baseUrl)) {
          throw new Error(`escaped fixture server: ${urlToCrawl}`);
        }

        const stac = await fetchWithRetry(urlToCrawl);
        const valid = validateStacObject(stac).valid;

        // Only valid STAC is handled into children
        if (valid) {
          const children = await handleSTACObject(stac, urlToCrawl, parentUrl);
          for (const child of children) {
            if (await validateQueueEntry(child.title, child.url, urlToCrawl)) {
              await addToQueue([child.title], [child.url], [urlToCrawl]);
            }
          }
        }

        await removeFromQueue(urlToCrawl);
        processed++;
        assert.ok(processed < 120);
      }

      return processed;
    };

    let rolledBack = false;

    try {
      await txClient.query('BEGIN ISOLATION LEVEL REPEATABLE READ');

      pool.query = (...args) => txClient.query(...args);

      await t.test('crawler_test:: reset urlQueue', async () => {
        await txClient.query('DELETE FROM stac."urlQueue";');
      });

      await t.test('crawler_test:: run 1', async () => {
        const processed = await crawlOnce();
        // root + mid + collection + false STAC + retry
        assert.equal(processed, 5);
      });

      await t.test('crawler_test:: urlQueue empty', async () => {
        const q = await txClient.query(`SELECT COUNT(*)::int AS c FROM stac."urlQueue";`);
        assert.equal(q.rows[0].c, 0);
      });

      await t.test('crawler_test: sources upserted (false STAC not stored)', async () => {
        const s = await txClient.query(
          `SELECT url FROM stac.sources WHERE url = ANY($1::text[]) ORDER BY url;`,
          [[rootUrl, midUrl, colUrl, falseUrl, retryUrl]]
        );
        // root + mid + collection + retry
        assert.equal(s.rowCount, 4);
      });

      await t.test('crawler_test: collection source_id = mid source id', async () => {
        const c = await txClient.query(
          `SELECT id, source_id FROM stac.collections WHERE id = $1 LIMIT 1;`,
          [expectedCollectionId]
        );
        assert.equal(c.rowCount, 1);

        const mid = await txClient.query(`SELECT id FROM stac.sources WHERE url = $1 LIMIT 1;`, [
          midUrl
        ]);
        assert.equal(mid.rowCount, 1);

        assert.equal(Number(c.rows[0].source_id), Number(mid.rows[0].id));
      });

      await t.test('crawler_test: false STAC not expanded', async () => {
        const p = `/it/${runId}/should-not-be-visited.json`;
        assert.equal(hitsByPath.get(p) ?? 0, 0);
      });

      await t.test('crawler_test: retry on 500 (fetchWithRetry)', async () => {
        assert.ok(retryStatus.length >= 2);
        assert.equal(retryStatus[0], 500);
        assert.equal(retryStatus[1], 200);
      });

      await t.test('crawler_test: run 2 (dublicates)', async () => {
        const processed = await crawlOnce();
        assert.equal(processed, 5);
      });

      await t.test('crawler_test: no duplicates', async () => {
        const sCount = await txClient.query(
          `SELECT COUNT(*)::int AS c FROM stac.sources WHERE url = ANY($1::text[]);`,
          [[rootUrl, midUrl, colUrl, falseUrl, retryUrl]]
        );
        assert.equal(sCount.rows[0].c, 4);

        const cCount = await txClient.query(
          `SELECT COUNT(*)::int AS c FROM stac.collections WHERE id = $1;`,
          [expectedCollectionId]
        );
        assert.equal(cCount.rows[0].c, 1);
      });

      await t.test('crawler_test: rollback', async () => {
        await txClient.query('ROLLBACK');
        rolledBack = true;
      });
    } finally {
      try {
        if (!rolledBack) await txClient.query('ROLLBACK');
      } catch {
      }
      pool.query = originalPoolQuery;
      txClient.release();
    }

    await t.test('outside crawler_test: rollback verified', async () => {
      await checkClient.connect();
      try {
        const s2 = await checkClient.query(
          `SELECT COUNT(*)::int AS c FROM stac.sources WHERE url = ANY($1::text[]);`,
          [[rootUrl, midUrl, colUrl, falseUrl, retryUrl]]
        );
        assert.equal(s2.rows[0].c, 0);

        const c2 = await checkClient.query(
          `SELECT COUNT(*)::int AS c FROM stac.collections WHERE id = $1;`,
          [expectedCollectionId]
        );
        assert.equal(c2.rows[0].c, 0);

        const q2 = await checkClient.query(
          `SELECT COUNT(*)::int AS c FROM stac."urlQueue" WHERE url_of_source = ANY($1::text[]);`,
          [[rootUrl, midUrl, colUrl, falseUrl, retryUrl]]
        );
        assert.equal(q2.rows[0].c, 0);
      } finally {
        await checkClient.end();
      }
    });

    server.close();
    await once(server, 'close');
  }
);