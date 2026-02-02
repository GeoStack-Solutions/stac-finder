import test from 'node:test';
import assert from 'node:assert/strict';

import { validateQueueEntry } from '../../validation/queue_validator.js';

test('validateQueueEntry: returns true for valid url + string title (no parentUrl)', async () => {
  const ok = await validateQueueEntry('Some Title', 'https://example.com/stac/catalog.json');
  assert.equal(ok, true);
});

test('validateQueueEntry: returns true for valid url + string title + valid parentUrl', async () => {
  const ok = await validateQueueEntry(
    'Some Title',
    'https://example.com/stac/catalog.json',
    'https://example.com/stac/'
  );
  assert.equal(ok, true);
});

test('validateQueueEntry: rejects invalid url formats (garbage, empty)', async () => {
  assert.equal(await validateQueueEntry('Title', 'not-a-url'), false);
  assert.equal(await validateQueueEntry('Title', ''), false);
});

test('validateQueueEntry: rejects missing url (null/undefined)', async () => {
  assert.equal(await validateQueueEntry('Title', undefined), false);
  assert.equal(await validateQueueEntry('Title', null), false);
});

test('validateQueueEntry: rejects non-string titles', async () => {
  assert.equal(await validateQueueEntry(123, 'https://example.com/x'), false);
  assert.equal(await validateQueueEntry(null, 'https://example.com/x'), false);
  assert.equal(await validateQueueEntry(undefined, 'https://example.com/x'), false);
  assert.equal(await validateQueueEntry({ t: 'x' }, 'https://example.com/x'), false);
});

test('validateQueueEntry: rejects invalid parentUrl, accepts null/omitted', async () => {
  assert.equal(
    await validateQueueEntry('Title', 'https://example.com/x', 'also-not-a-url'),
    false
  );

  assert.equal(await validateQueueEntry('Title', 'https://example.com/x', ''), false);
  assert.equal(await validateQueueEntry('Title', 'https://example.com/x', null), true);

  assert.equal(await validateQueueEntry('Title', 'https://example.com/x'), true);
});

test('validateQueueEntry: does not throw on weird inputs (always resolves boolean)', async () => {
  await assert.doesNotReject(validateQueueEntry('Title', 'not-a-url'));
  await assert.doesNotReject(validateQueueEntry(undefined, undefined, undefined));
});