const { parseCql2 } = require('../cql2parser');
const { astToSql } = require('../cql2sql');
const queryableMap = require('../queryableMap');

test('LIKE on title', () => {
  const params = [];
  const ast = parseCql2("title LIKE '%Sentinel%'");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('title ILIKE $1');
  expect(params).toEqual(['%Sentinel%']);
});

test('IN on keywords (text[]) uses overlap', () => {
  const params = [];
  const ast = parseCql2("keywords IN ('eo','sar')");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('keywords && $1::text[]');
  expect(params).toEqual([['eo','sar']]);
});

test('IN on license (text) uses ANY', () => {
  const params = [];
  const ast = parseCql2("license IN ('CC-BY-4.0','proprietary')");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('license = ANY($1::text[])');
  expect(params).toEqual([['CC-BY-4.0','proprietary']]);
});

test('BETWEEN on temporal_start', () => {
  const params = [];
  const ast = parseCql2("temporal_start BETWEEN '2020-01-01T00:00:00Z' AND '2021-01-01T00:00:00Z'");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('temporal_start BETWEEN $1::timestamptz AND $2::timestamptz');
  expect(params.length).toBe(2);
});

test('Combined AND/OR with parentheses', () => {
  const params = [];
  const ast = parseCql2("license = 'CC-BY-4.0' AND (title LIKE '%Sentinel%' OR keywords IN ('eo'))");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('AND');
  expect(where).toContain('OR');
  expect(params.length).toBe(3);
});