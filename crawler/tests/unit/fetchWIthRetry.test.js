import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchWithRetry } from '../../crawlingEngine/crawler_functions.js';

function makeResponse({ status = 200, ok = true, statusText = 'OK', jsonData, jsonError } = {}) {
  return {
    ok,
    status,
    statusText,
    async json() {
      if (jsonError) throw jsonError;
      return jsonData;
    }
  };
}

// Makes backoff instant
function installImmediateTimers({ fireAbortTimeout = false } = {}) {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  let nextId = 1;

  globalThis.setTimeout = (fn, ms, ...args) => {
    const id = nextId++;

    // AbortController timeout (15s)
    if (ms >= 10000) {
      if (fireAbortTimeout) fn(...args);
      return id;
    }

    fn(...args);
    return id;
  };

  globalThis.clearTimeout = (_id) => {
  };

  return () => {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  };
}

test('fetchWithRetry: returns parsed JSON on 200', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => makeResponse({ status: 200, ok: true, jsonData: { hello: 'world' } });

  try {
    const data = await fetchWithRetry('https://example.com/x', 1);
    assert.deepEqual(data, { hello: 'world' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchWithRetry: throws on JSON parse error even if status is ok', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    makeResponse({ status: 200, ok: true, jsonError: new Error('bad json') });

  try {
    await assert.rejects(
      () => fetchWithRetry('https://example.com/x', 1),
      (err) => String(err.message).includes('Failed to parse JSON')
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchWithRetry: fatal 404 does not retry (single fetch call)', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;
    return makeResponse({ status: 404, ok: false, statusText: 'Not Found' });
  };

  try {
    await assert.rejects(
      () => fetchWithRetry('https://example.com/x', 3),
      (err) => String(err.message).includes('Fatal Client Error 404')
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchWithRetry: fatal 504 does not retry (single fetch call)', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;
    return makeResponse({ status: 504, ok: false, statusText: 'Gateway Timeout' });
  };

  try {
    await assert.rejects(
      () => fetchWithRetry('https://example.com/x', 3),
      (err) => String(err.message).includes('Fatal Server Error 504')
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchWithRetry: retries on 429 and succeeds', async () => {
  const restoreTimers = installImmediateTimers();
  const originalFetch = globalThis.fetch;

  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) return makeResponse({ status: 429, ok: false, statusText: 'Too Many Requests' });
    return makeResponse({ status: 200, ok: true, jsonData: { ok: true } });
  };

  try {
    const data = await fetchWithRetry('https://example.com/x', 2);
    assert.deepEqual(data, { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    restoreTimers();
  }
});

test('fetchWithRetry: retries on network error and succeeds', async () => {
  const restoreTimers = installImmediateTimers();
  const originalFetch = globalThis.fetch;

  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) throw new Error('ECONNRESET');
    return makeResponse({ status: 200, ok: true, jsonData: { ok: true } });
  };

  try {
    const data = await fetchWithRetry('https://example.com/x', 2);
    assert.deepEqual(data, { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    restoreTimers();
  }
});

test('fetchWithRetry: AbortError is converted into fatal timeout error', async () => {
  const restoreTimers = installImmediateTimers({ fireAbortTimeout: true });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_url, opts) => {
    if (opts?.signal?.aborted) {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }
    const e = new Error('aborted');
    e.name = 'AbortError';
    throw e;
  };

  try {
    await assert.rejects(
      () => fetchWithRetry('https://example.com/x', 3),
      (err) => String(err.message).includes('Fatal: Timeout of 15s reached')
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreTimers();
  }
});