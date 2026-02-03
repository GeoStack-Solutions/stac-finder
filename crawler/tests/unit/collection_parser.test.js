import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCollection } from '../../handleCollections/CollectionParser.js';

test('parseCollection: returns null for non-Collection inputs', () => {
  assert.equal(parseCollection(null, 's', new Date()), null);
  assert.equal(parseCollection(undefined, 's', new Date()), null);
  assert.equal(parseCollection({ type: 'Catalog' }, 's', new Date()), null);
  assert.equal(parseCollection({ type: 'Item' }, 's', new Date()), null);
});

test('parseCollection: parses and normalizes core fields (id/license/title/extent/doi/providers/summaries)', () => {
  const crawledAt = new Date('2025-01-01T00:00:00Z');

  const stac = {
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'a/b/c',
    description: 'desc',
    license: 'CC BY 4.0',
    extent: {
      spatial: { bbox: [[-10, -20, 10, 20]] },
      temporal: { interval: [['2020-01-01T00:00:00Z', '2021-01-01T00:00:00Z']] }
    },
    keywords: ['k1', 'k2'],
    providers: { name: 'P1' },
    'sci:doi': '10.1234/abc',
    doi: '10.9999/ignored',
    summaries: {
      platform: 'sentinel-2',
      constellation: ['s2a', 's2b'],
      gsd: 10,
      'processing:level': null
    },
    stac_extensions: [
      'https://stac-extensions.github.io/eo/v1.1.0/schema.json',
      'https://stac-extensions.github.io/projection/v1.1.0/schema.json'
    ]
  };

  const out = parseCollection(stac, 42, crawledAt);

  assert.ok(out);
  assert.equal(out.id, 'a_b_c');
  assert.equal(out.title, 'a_b_c');
  assert.equal(out.description, 'desc');

  assert.equal(out.source_id, 42);
  assert.equal(out.last_crawled_timestamp, crawledAt);

  assert.deepEqual(out.bbox, [-10, -20, 10, 20]);
  assert.equal(out.temporal_start, '2020-01-01T00:00:00Z');
  assert.equal(out.temporal_end, '2021-01-01T00:00:00Z');

  assert.deepEqual(out.keywords, ['k1', 'k2']);
  assert.deepEqual(out.providers, [{ name: 'P1' }]);

  assert.equal(out.license, 'CC-BY-4.0');

  assert.equal(out.doi, '10.1234/abc');

  assert.deepEqual(out.platform, ['sentinel-2']);
  assert.deepEqual(out.constellation, ['s2a', 's2b']);
  assert.deepEqual(out.gsd, [10]);
  assert.deepEqual(out.processing_level, []);

  assert.deepEqual(out.stac_extensions, ['eo', 'projection']);
});

test('parseCollection: handles missing optional fields safely', () => {
  const stac = {
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'x',
    license: 'proprietary',
    extent: { spatial: { bbox: [[-180, -90, 180, 90]] }, temporal: { interval: [[null, null]] } }
  };

  const out = parseCollection(stac, null, null);

  assert.ok(out);
  assert.equal(out.id, 'x');
  assert.equal(out.title, 'x'); 
  assert.equal(out.description, null);
  assert.equal(out.source_id, null);
  assert.equal(out.last_crawled_timestamp, null);

  assert.deepEqual(out.keywords, []);
  assert.deepEqual(out.providers, []);
  assert.deepEqual(out.platform, []);
  assert.deepEqual(out.constellation, []);
  assert.deepEqual(out.gsd, []);
  assert.deepEqual(out.processing_level, []);

  assert.equal(out.temporal_start, null);
  assert.equal(out.temporal_end, null);
});

test('parseCollection: stac_extensions normalization drops unparseable entries and non-arrays', () => {
  const stac1 = {
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'x',
    license: 'proprietary',
    extent: { spatial: { bbox: [[0, 0, 1, 1]] }, temporal: { interval: [[null, null]] } },
    stac_extensions: [
      'not-a-url',
      'https://stac-extensions.github.io/eo/v1.1.0/schema.json'
    ]
  };
  const out1 = parseCollection(stac1, 1, new Date());
  assert.deepEqual(out1.stac_extensions, ['eo']);

  const stac2 = { ...stac1, stac_extensions: 'eo' };
  const out2 = parseCollection(stac2, 1, new Date());
  assert.deepEqual(out2.stac_extensions, []);
});

test('parseCollection: raw_json is a deep clone (changes do not bleed between input/output)', () => {
  const stac = {
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'x',
    license: 'proprietary',
    extent: { spatial: { bbox: [[0, 0, 1, 1]] }, temporal: { interval: [[null, null]] } },
    providers: [{ name: 'P1', roles: ['producer'] }]
  };

  const out = parseCollection(stac, 1, new Date());
  assert.notEqual(out.raw_json, stac);
  assert.deepEqual(out.raw_json.providers[0].roles, ['producer']);

  stac.providers[0].roles.push('processor');
  assert.deepEqual(out.raw_json.providers[0].roles, ['producer']);

  out.raw_json.providers[0].name = 'CHANGED';
  assert.equal(stac.providers[0].name, 'P1');
});