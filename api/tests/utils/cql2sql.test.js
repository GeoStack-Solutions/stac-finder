const { parseCql2 } = require('../../utils/cql2parser');
const { astToSql } = require('../../utils/cql2sql');
const queryableMap = require('../../utils/queryableMap');

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

test('NOT wraps expression', () => {
  const params = [];
  const ast = parseCql2("NOT license = 'CC-BY-4.0'");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('NOT');
  expect(params).toEqual(['CC-BY-4.0']);
});

test('AND has higher precedence than OR (or parentheses are preserved)', () => {
  const params = [];
  const ast = parseCql2("license = 'a' OR license = 'b' AND title LIKE '%S%'");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('OR');
  expect(where).toContain('AND');
  expect(params.length).toBe(3);
});

test('not equals', () => {
  const params = [];
  const ast = parseCql2("license != 'proprietary'");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('license <> $1');
  expect(params).toEqual(['proprietary']);
});

test('unknown queryable throws', () => {
  const params = [];
  const ast = parseCql2("unknown_field = 'x'");
  expect(() => astToSql(ast, queryableMap, params)).toThrow(/Unknown queryable/);
});

test('parameter order follows traversal', () => {
  const params = [];
  const ast = parseCql2("license = 'a' AND title LIKE '%b%' AND license = 'c'");
  astToSql(ast, queryableMap, params);
  expect(params).toEqual(['a', '%b%', 'c']);
});

test('LIKE on keywords (text[]) uses unnest + ILIKE', () => {
  const params = [];
  const ast = parseCql2("keywords LIKE '%eo%'");
  const where = astToSql(ast, queryableMap, params);

  expect(where).toContain('EXISTS');
  expect(where).toContain('unnest');
  expect(where).toContain('ILIKE $1');
  expect(params).toEqual(['%eo%']);
});