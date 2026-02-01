const { parseCql2Filter } = require('../../utils/filtering');

describe('CQL2 filter-lang handling', () => {

  test('cql2-text filter works', () => {
    const params = [];
    const { whereClause, error } = parseCql2Filter(
      "title LIKE '%Sentinel%'",
      'cql2-text',
      params
    );

    expect(error).toBeNull();
    expect(whereClause).toContain('ILIKE');
    expect(params).toEqual(['%Sentinel%']);
  });

  test('cql2-json filter works', () => {
    const params = [];
    const filter = JSON.stringify({
      op: '=',
      args: [{ property: 'license' }, 'CC-BY-4.0']
    });

    const { whereClause, error } = parseCql2Filter(
      filter,
      'cql2-json',
      params
    );

    expect(error).toBeNull();
    expect(whereClause).toContain('=');
    expect(params).toEqual(['CC-BY-4.0']);
  });

  test('invalid filter-lang returns error', () => {
    const params = [];
    const { error } = parseCql2Filter(
      "id = 'abc'",
      'cql3-text',
      params
    );

    expect(error).not.toBeNull();
    expect(error.status).toBe(400);
  });

  test('missing filter-lang uses default or returns 400', () => {
    const params = [];
    const { whereClause, error } = parseCql2Filter(
      "title LIKE '%Sentinel%'",
      undefined,
      params
    );
  
    // entweder Default (z.B. cql2-text) oder 400 - je nach Implementierung
    if (error) {
      expect(error.status).toBe(400);
    } else {
      expect(whereClause).toBeTruthy();
      expect(whereClause).toContain('ILIKE');
      expect(params).toEqual(['%Sentinel%']);
    }
  });
  
  test('cql2-json but text input returns error', () => {
    const params = [];
    const { whereClause, error } = parseCql2Filter(
      "license = 'CC-BY-4.0'",
      'cql2-json',
      params
    );
  
    expect(whereClause).toBeFalsy();
    expect(error).toBeTruthy();
    expect(error.status).toBe(400);
  });
  
  test('params are appended in correct order', () => {
    const params = [];
    const { whereClause, error } = parseCql2Filter(
      "license = 'CC-BY-4.0' AND title LIKE '%Sentinel%' AND license = 'proprietary'",
      'cql2-text',
      params
    );
  
    expect(error).toBeNull();
    expect(whereClause).toBeTruthy();
    expect(params).toEqual(['CC-BY-4.0', '%Sentinel%', 'proprietary']);
    expect(whereClause).toContain('$1');
    expect(whereClause).toContain('$2');
    expect(whereClause).toContain('$3');
  });

});