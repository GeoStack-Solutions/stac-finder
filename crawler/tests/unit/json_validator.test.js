import test from 'node:test';
import assert from 'node:assert/strict';

import { validateStacObject } from '../../validation/json_validator.js';

test('validateStacObject: Feature (Item) is treated as valid+ignored', () => {
  const report = validateStacObject({ type: 'Feature' });
  assert.equal(report.valid, true);
  assert.equal(report.isIgnored, true);
  assert.equal(typeof report.errorsText, 'string');
});

test('validateStacObject: unknown or missing type fails with errors', () => {
  const missing = validateStacObject({});
  assert.equal(missing.valid, false);
  assert.equal(missing.isIgnored, false);
  assert.ok(Array.isArray(missing.errors));
  assert.ok(typeof missing.errorsText === 'string');

  const unknown = validateStacObject({ type: 'SomethingElse' });
  assert.equal(unknown.valid, false);
  assert.equal(unknown.isIgnored, false);
  assert.ok(Array.isArray(unknown.errors));
  assert.ok(typeof unknown.errorsText === 'string');
});

test('validateStacObject: minimal valid Catalog passes', () => {
  const catalog = {
    type: 'Catalog',
    stac_version: '1.0.0',
    id: 'cat-1',
    description: 'A catalog',
    links: [{ rel: 'self', href: 'https://example.com/catalog.json' }]
  };

  const report = validateStacObject(catalog);
  assert.equal(report.valid, true);
  assert.equal(report.isIgnored, false);
  assert.equal(report.errors, null);
  assert.equal(report.errorsText, null);
});

test('validateStacObject: Catalog missing required fields fails', () => {
  const report = validateStacObject({
    type: 'Catalog',
    stac_version: '1.0.0',
    id: 'cat-1'
  });

  assert.equal(report.valid, false);
  assert.equal(report.isIgnored, false);
  assert.ok(Array.isArray(report.errors));
  assert.ok(report.errorsText?.includes('Invalid STAC Catalog'));
});

test('validateStacObject: Catalog with empty id fails', () => {
  const report = validateStacObject({
    type: 'Catalog',
    stac_version: '1.0.0',
    id: '',
    description: 'desc',
    links: [{ rel: 'self', href: 'https://example.com/catalog.json' }]
  });

  assert.equal(report.valid, false);
  assert.ok(Array.isArray(report.errors));
});

test('validateStacObject: minimal valid Collection passes', () => {
  const collection = {
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'col-1',
    description: 'A collection',
    license: 'proprietary',
    extent: {
      spatial: { bbox: [[-180, -90, 180, 90]] },
      temporal: { interval: [['2020-01-01T00:00:00Z', null]] }
    },
    links: [{ rel: 'self', href: 'https://example.com/collections/col-1' }]
  };

  const report = validateStacObject(collection);
  assert.equal(report.valid, true);
  assert.equal(report.isIgnored, false);
  assert.equal(report.errors, null);
  assert.equal(report.errorsText, null);
});

test('validateStacObject: Collection missing required fields fails', () => {
  const report = validateStacObject({
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'col-1',
    description: 'A collection'
  });

  assert.equal(report.valid, false);
  assert.equal(report.isIgnored, false);
  assert.ok(Array.isArray(report.errors));
  assert.ok(report.errorsText?.includes('Invalid STAC Collection'));
});

test('validateStacObject: Collection invalid bbox fails', () => {
  const report = validateStacObject({
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'col-1',
    description: 'A collection',
    license: 'proprietary',
    extent: {
      spatial: { bbox: [['a', 'b', 'c', 'd']] },
      temporal: { interval: [['2020-01-01T00:00:00Z', null]] }
    },
    links: [{ rel: 'self', href: 'https://example.com/collections/col-1' }]
  });

  assert.equal(report.valid, false);
  assert.ok(Array.isArray(report.errors));
});

test('validateStacObject: Collection invalid date-time fails', () => {
  const report = validateStacObject({
    type: 'Collection',
    stac_version: '1.0.0',
    id: 'col-1',
    description: 'A collection',
    license: 'proprietary',
    extent: {
      spatial: { bbox: [[-180, -90, 180, 90]] },
      temporal: { interval: [['not-a-date', null]] }
    },
    links: [{ rel: 'self', href: 'https://example.com/collections/col-1' }]
  });

  assert.equal(report.valid, false);
  assert.ok(Array.isArray(report.errors));
});

test('validateStacObject: extra properties are allowed', () => {
  const report = validateStacObject({
    type: 'Catalog',
    stac_version: '1.0.0',
    id: 'cat-1',
    description: 'A catalog',
    links: [{ rel: 'self', href: 'https://example.com/catalog.json' }],
    myCustomField: { anything: 123 }
  });

  assert.equal(report.valid, true);
});