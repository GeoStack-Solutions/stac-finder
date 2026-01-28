const { parseSortby } = require('../../utils/sorting');

describe('Sorting Utils', () => {
  const allowedColumns = ['id', 'title', 'description'];

  describe('Valid sorting', () => {
    test('should parse ascending sort', () => {
      const result = parseSortby('title', allowedColumns);
      expect(result.orderByClauses).toEqual(['title ASC']);
      expect(result.error).toBeNull();
    });

    test('should parse descending sort', () => {
      const result = parseSortby('-title', allowedColumns);
      expect(result.orderByClauses).toEqual(['title DESC']);
      expect(result.error).toBeNull();
    });

    test('should parse explicit ascending sort with +', () => {
      const result = parseSortby('+title', allowedColumns);
      expect(result.orderByClauses).toEqual(['title ASC']);
      expect(result.error).toBeNull();
    });

    test('should parse multiple fields', () => {
      const result = parseSortby('+title,-id', allowedColumns);
      expect(result.orderByClauses).toEqual(['title ASC', 'id DESC']);
      expect(result.error).toBeNull();
    });

    test('should handle three or more fields', () => {
      const result = parseSortby('title,-id,+description', allowedColumns);
      expect(result.orderByClauses).toEqual(['title ASC', 'id DESC', 'description ASC']);
      expect(result.error).toBeNull();
    });

    test('should handle whitespace around fields', () => {
      const result = parseSortby(' title , -id ', allowedColumns);
      expect(result.orderByClauses).toEqual(['title ASC', 'id DESC']);
      expect(result.error).toBeNull();
    });

    test('should return empty array for null sortby', () => {
      const result = parseSortby(null, allowedColumns);
      expect(result.orderByClauses).toEqual([]);
      expect(result.error).toBeNull();
    });

    test('should return empty array for undefined sortby', () => {
      const result = parseSortby(undefined, allowedColumns);
      expect(result.orderByClauses).toEqual([]);
      expect(result.error).toBeNull();
    });

    test('should return empty array for empty string', () => {
      const result = parseSortby('', allowedColumns);
      expect(result.orderByClauses).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('Invalid sorting', () => {
    test('should return error for invalid field', () => {
      const result = parseSortby('invalid_field', allowedColumns);
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(400);
      expect(result.error.error).toBe('Invalid sortby parameter');
      expect(result.orderByClauses).toEqual([]);
    });

    test('should return error if any field in list is invalid', () => {
      const result = parseSortby('title,invalid_field', allowedColumns);
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(400);
      expect(result.orderByClauses).toEqual([]);
    });

    test('should return error for invalid field with prefix', () => {
      const result = parseSortby('-invalid_field', allowedColumns);
      expect(result.error).toBeDefined();
      expect(result.orderByClauses).toEqual([]);
    });

    test('should include allowed columns in error message', () => {
      const result = parseSortby('bad_field', allowedColumns);
      expect(result.error.message).toContain('id');
      expect(result.error.message).toContain('title');
      expect(result.error.message).toContain('description');
    });

    test('should include format hint in error message', () => {
      const result = parseSortby('bad_field', allowedColumns);
      expect(result.error.message).toContain('sortby=field');
      expect(result.error.message).toContain('ascending');
      expect(result.error.message).toContain('descending');
    });
  });

  describe('Edge cases', () => {
    test('should handle single allowed column', () => {
      const result = parseSortby('title', ['title']);
      expect(result.orderByClauses).toEqual(['title ASC']);
      expect(result.error).toBeNull();
    });

    test('should fail with empty allowedColumns array', () => {
      const result = parseSortby('title', []);
      expect(result.error).toBeDefined();
    });

    test('should handle duplicate fields', () => {
      const result = parseSortby('title,title', allowedColumns);
      expect(result.orderByClauses).toEqual(['title ASC', 'title ASC']);
      expect(result.error).toBeNull();
    });

    test('should handle same field with different directions', () => {
      const result = parseSortby('title,-title', allowedColumns);
      expect(result.orderByClauses).toEqual(['title ASC', 'title DESC']);
      expect(result.error).toBeNull();
    });

    test('should handle field with only + prefix', () => {
      const result = parseSortby('+', allowedColumns);
      expect(result.error).toBeDefined();
    });

    test('should handle field with only - prefix', () => {
      const result = parseSortby('-', allowedColumns);
      expect(result.error).toBeDefined();
    });

    test('should be case-sensitive for field names', () => {
      const result = parseSortby('Title', allowedColumns);
      expect(result.error).toBeDefined();
    });

    test('should handle comma without fields', () => {
      const result = parseSortby(',', allowedColumns);
      // Should try to parse empty strings which will fail
      expect(result.error).toBeDefined();
    });
  });

  describe('SQL injection protection', () => {
    test('should reject field with SQL injection attempt', () => {
      const result = parseSortby("title; DROP TABLE collections--", allowedColumns);
      expect(result.error).toBeDefined();
      expect(result.orderByClauses).toEqual([]);
    });

    test('should reject field with special characters', () => {
      const result = parseSortby('title; DELETE', allowedColumns);
      expect(result.error).toBeDefined();
    });

    test('should only accept whitelisted columns', () => {
      const result = parseSortby('users.password', allowedColumns);
      expect(result.error).toBeDefined();
    });
  });
});