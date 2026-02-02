import test from 'node:test';
import assert from 'node:assert/strict';

import { validateSource } from '../../validation/source_validator.js';

test('validateSource: valid url + type => true', () => {
  assert.equal(validateSource({ url: 'https://example.com/x', type: 'Catalog' }), true);
});

test('validateSource: missing url/type => false', () => {
  assert.equal(validateSource({ type: 'Catalog' }), false);
  assert.equal(validateSource({ url: 'https://example.com/x' }), false);
  assert.equal(validateSource({ url: '', type: 'Catalog' }), false);
});

test('validateSource: invalid url => false', () => {
  assert.equal(validateSource({ url: 'not-a-url', type: 'Catalog' }), false);
});
