const { parseTextSearch } = require('../../utils/filtering');

describe('Free-Text Search Utils', () => {
  describe('parseTextSearch', () => {
    describe('Valid inputs', () => {
      test('should handle single search term', () => {
        const result = parseTextSearch('sentinel');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%sentinel%']);
        expect(result.whereClause).toContain('title ILIKE $1');
        expect(result.whereClause).toContain('description ILIKE $1');
        expect(result.whereClause).toContain('license ILIKE $1');
        expect(result.whereClause).toContain('array_to_string(keywords, \' \') ILIKE $1');
        expect(result.whereClause).toContain('providers::text ILIKE $1');
      });

      test('should handle multiple search terms with OR logic', () => {
        const result = parseTextSearch('sentinel landsat');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%sentinel%', '%landsat%']);
        expect(result.whereClause).toContain('$1');
        expect(result.whereClause).toContain('$2');
        expect(result.whereClause).toContain('OR');
      });

      test('should handle three or more search terms', () => {
        const result = parseTextSearch('sentinel landsat modis');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%sentinel%', '%landsat%', '%modis%']);
        expect(result.params.length).toBe(3);
      });

      test('should handle terms with special characters', () => {
        const result = parseTextSearch('sentinel-2');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%sentinel-2%']);
      });

      test('should trim whitespace from search query', () => {
        const result = parseTextSearch('  sentinel  ');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%sentinel%']);
      });

      test('should handle multiple spaces between terms', () => {
        const result = parseTextSearch('sentinel    landsat');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%sentinel%', '%landsat%']);
        expect(result.params.length).toBe(2);
      });

      test('should be case-insensitive (lowercase input)', () => {
        const result = parseTextSearch('sentinel');
        
        expect(result.error).toBeNull();
        expect(result.whereClause).toContain('ILIKE');
      });

      test('should be case-insensitive (uppercase input)', () => {
        const result = parseTextSearch('SENTINEL');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%SENTINEL%']);
        expect(result.whereClause).toContain('ILIKE');
      });

      test('should be case-insensitive (mixed case input)', () => {
        const result = parseTextSearch('Sentinel');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%Sentinel%']);
        expect(result.whereClause).toContain('ILIKE');
      });

      test('should handle partial word matching pattern', () => {
        const result = parseTextSearch('optic');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%optic%']);
      });

      test('should handle maximum valid length (200 characters)', () => {
        const longQuery = 'a'.repeat(200);
        const result = parseTextSearch(longQuery);
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual([`%${longQuery}%`]);
      });
    });

    describe('Empty or null inputs', () => {
      test('should return null for undefined query', () => {
        const result = parseTextSearch(undefined);
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });

      test('should return null for null query', () => {
        const result = parseTextSearch(null);
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });

      test('should return null for empty string', () => {
        const result = parseTextSearch('');
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });

      test('should return null for whitespace-only string', () => {
        const result = parseTextSearch('   ');
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });

      test('should return null for tabs and newlines', () => {
        const result = parseTextSearch('\t\n  \t');
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });
    });

    describe('Invalid inputs', () => {
      test('should reject query exceeding maximum length', () => {
        const tooLong = 'a'.repeat(201);
        const result = parseTextSearch(tooLong);
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).not.toBeNull();
        expect(result.error.status).toBe(400);
        expect(result.error.error).toBe('Invalid search query');
        expect(result.error.message).toContain('too long');
        expect(result.error.message).toContain('200 characters');
      });

      test('should reject non-string input (number)', () => {
        const result = parseTextSearch(123);
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });

      test('should reject non-string input (object)', () => {
        const result = parseTextSearch({ query: 'test' });
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });

      test('should reject non-string input (array)', () => {
        const result = parseTextSearch(['sentinel', 'landsat']);
        
        expect(result.whereClause).toBeNull();
        expect(result.params).toEqual([]);
        expect(result.error).toBeNull();
      });
    });

    describe('SQL structure validation', () => {
      test('should generate correct parameter placeholders for single term', () => {
        const result = parseTextSearch('test');
        
        expect(result.whereClause).toContain('$1');
        expect(result.whereClause).not.toContain('$2');
      });

      test('should generate correct parameter placeholders for multiple terms', () => {
        const result = parseTextSearch('term1 term2 term3');
        
        expect(result.whereClause).toContain('$1');
        expect(result.whereClause).toContain('$2');
        expect(result.whereClause).toContain('$3');
        expect(result.params.length).toBe(3);
      });

      test('should wrap entire clause in parentheses', () => {
        const result = parseTextSearch('sentinel');
        
        expect(result.whereClause).toMatch(/^\(/);
        expect(result.whereClause).toMatch(/\)$/);
      });

      test('should search all required fields', () => {
        const result = parseTextSearch('test');
        const requiredFields = ['title', 'description', 'license', 'keywords', 'providers'];
        
        requiredFields.forEach(field => {
          expect(result.whereClause).toContain(field);
        });
      });

      test('should use ILIKE operator for case-insensitive search', () => {
        const result = parseTextSearch('test');
        
        expect(result.whereClause).toContain('ILIKE');
        expect(result.whereClause).not.toMatch(/\bLIKE\s/);
      });

      test('should use OR logic between fields for same term', () => {
        const result = parseTextSearch('sentinel');
        
        const orMatches = result.whereClause.match(/OR/g);
        expect(orMatches).not.toBeNull();
        expect(orMatches.length).toBeGreaterThan(0);
      });

      test('should use OR logic between different terms', () => {
        const result = parseTextSearch('sentinel landsat');
        
        expect(result.whereClause).toContain('OR');
      });
    });

    describe('Real-world scenarios', () => {
      test('should handle satellite name search', () => {
        const result = parseTextSearch('Sentinel-2');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%Sentinel-2%']);
      });

      test('should handle license search', () => {
        const result = parseTextSearch('CC-BY-4.0');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%CC-BY-4.0%']);
      });

      test('should handle provider name search', () => {
        const result = parseTextSearch('ESA');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%ESA%']);
      });

      test('should handle keyword search', () => {
        const result = parseTextSearch('optical');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%optical%']);
      });

      test('should handle multiple satellite search', () => {
        const result = parseTextSearch('Sentinel Landsat MODIS');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%Sentinel%', '%Landsat%', '%MODIS%']);
        expect(result.params.length).toBe(3);
      });

      test('should handle partial word matching scenario', () => {
        const result = parseTextSearch('optic land');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%optic%', '%land%']);
      });

      test('should handle descriptive search terms', () => {
        const result = parseTextSearch('high resolution imagery');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%high%', '%resolution%', '%imagery%']);
      });
    });

    describe('Edge cases', () => {
      test('should handle single character search', () => {
        const result = parseTextSearch('a');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%a%']);
      });

      test('should handle numeric search term', () => {
        const result = parseTextSearch('2024');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%2024%']);
      });

      test('should handle search with underscores', () => {
        const result = parseTextSearch('test_data');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%test_data%']);
      });

      test('should handle search with dots', () => {
        const result = parseTextSearch('sentinel.2');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%sentinel.2%']);
      });

      test('should handle URL-like search terms', () => {
        const result = parseTextSearch('https://example.com');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%https://example.com%']);
      });
    });

    describe('SQL Injection & Special Characters', () => {
      test('should handle SQL wildcard % character', () => {
        const result = parseTextSearch('test%data');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%test%data%']);
        // Note: % is not escaped - this could match unintended patterns
        // This is a potential security/functionality issue
      });

      test('should handle SQL wildcard _ character', () => {
        const result = parseTextSearch('test_data');
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(['%test_data%']);
        // Note: _ is not escaped - could match any single character
      });

      test('should handle single quote character', () => {
        const result = parseTextSearch("test'data");
        
        expect(result.error).toBeNull();
        expect(result.params).toEqual(["%test'data%"]);
        // Single quotes should be safe with parameterized queries
      });

      test('should handle backslash character', () => {
        const result = parseTextSearch('test\\data');
        
        expect(result.error).toBeNull();
        expect(result.params[0]).toContain('\\');
      });

      test('should handle multiple SQL special characters', () => {
        const result = parseTextSearch("test%_'data");
        
        expect(result.error).toBeNull();
        expect(result.params.length).toBe(1);
      });
    });

    describe('Parameter Index Management', () => {
      test('should start parameter indices at $1', () => {
        const result = parseTextSearch('test');
        
        expect(result.whereClause).toContain('$1');
        expect(result.whereClause).not.toContain('$0');
      });

      test('should increment indices sequentially for multiple terms', () => {
        const result = parseTextSearch('term1 term2 term3');
        
        expect(result.whereClause).toContain('$1');
        expect(result.whereClause).toContain('$2');
        expect(result.whereClause).toContain('$3');
        expect(result.params.length).toBe(3);
      });

      test('should match params length with highest parameter index', () => {
        const result = parseTextSearch('a b c d e');
        
        const maxIndex = Math.max(...Array.from(result.whereClause.matchAll(/\$(\d+)/g)).map(m => parseInt(m[1])));
        expect(result.params.length).toBe(maxIndex);
      });
    });

    describe('Array and Keywords field handling', () => {
      test('should search in keywords array using array_to_string', () => {
        const result = parseTextSearch('optical');
        
        expect(result.whereClause).toContain("array_to_string(keywords, ' ')");
      });

      test('should search in providers using text cast', () => {
        const result = parseTextSearch('ESA');
        
        expect(result.whereClause).toContain('providers::text');
      });
    });
  });
});
