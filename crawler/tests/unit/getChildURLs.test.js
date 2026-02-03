import test from 'node:test';
import assert from 'node:assert/strict';

import { getChildURLs } from '../../crawlingEngine/crawler_functions.js';

test('getChildURLs: resolves relative child hrefs against parent Link', () => {
  const stac = {
    links: [{ rel: 'child', href: 'child/catalog.json', title: 'Child Catalog' }]
  };

  const out = getChildURLs(stac, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, [
    { title: 'Child Catalog', url: 'https://example.com/root/child/catalog.json' }
  ]);
});

test('getChildURLs: keeps absolute child hrefs as-is', () => {
  const stac = {
    links: [{ rel: 'child', href: 'https://other.example.com/x.json', title: 'Abs' }]
  };

  const out = getChildURLs(stac, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, [{ title: 'Abs', url: 'https://other.example.com/x.json' }]);
});

test('getChildURLs: only processes rel==="child" and requires href', () => {
  const stac = {
    links: [
      { rel: 'self', href: 'https://example.com/root/catalog.json' },
      { rel: 'child', title: 'Missing href' },
      { rel: 'item', href: 'https://example.com/item.json' },
      { rel: 'child', href: 'ok.json', title: 'OK' }
    ]
  };

  const out = getChildURLs(stac, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, [{ title: 'OK', url: 'https://example.com/root/ok.json' }]);
});

test('getChildURLs: skips invalid child hrefs without throwing', () => {
  const stac = {
    links: [
      { rel: 'child', href: 'http://[::1', title: 'Broken URL' }, 
      { rel: 'child', href: 'ok.json', title: 'OK' }
    ]
  };

  const out = getChildURLs(stac, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, [{ title: 'OK', url: 'https://example.com/root/ok.json' }]);
});

test('getChildURLs: accepts child links when type is application/json OR undefined', () => {
  const stac = {
    links: [
      { rel: 'child', href: 'a.json', type: 'application/json', title: 'A' },
      { rel: 'child', href: 'b.json', title: 'B (no type)' }
    ]
  };

  const out = getChildURLs(stac, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, [
    { title: 'A', url: 'https://example.com/root/a.json' },
    { title: 'B (no type)', url: 'https://example.com/root/b.json' }
  ]);
});

test('getChildURLs: filters out child links with type application/geo+json or other non-json types', () => {
  const stac = {
    links: [
      { rel: 'child', href: 'geo.json', type: 'application/geo+json', title: 'Geo' },
      { rel: 'child', href: 'html', type: 'text/html', title: 'HTML' },
      { rel: 'child', href: 'ok.json', type: 'application/json', title: 'OK' }
    ]
  };

  const out = getChildURLs(stac, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, [{ title: 'OK', url: 'https://example.com/root/ok.json' }]);
});

test('getChildURLs: uses "no title" when title is missing or empty string', () => {
  const stac = {
    links: [
      { rel: 'child', href: 'a.json' },
      { rel: 'child', href: 'b.json', title: '' }
    ]
  };

  const out = getChildURLs(stac, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, [
    { title: 'no title', url: 'https://example.com/root/a.json' },
    { title: 'no title', url: 'https://example.com/root/b.json' }
  ]);
});

test('getChildURLs: returns empty array when links is empty', () => {
  const out = getChildURLs({ links: [] }, 'https://example.com/root/catalog.json');
  assert.deepEqual(out, []);
});
