const { parsePaginationParams, createPaginationToken, createPaginationLinks } = require('../../utils/pagination');

describe('Pagination Utils', () => {
  describe('parsePaginationParams', () => {
    test('should use default limit when not provided', () => {
      const result = parsePaginationParams({});
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    test('should parse limit correctly', () => {
      const result = parsePaginationParams({ limit: '20' });
      expect(result.limit).toBe(20);
    });

    test('should cap limit at maximum', () => {
      const result = parsePaginationParams({ limit: '99999' });
      expect(result.limit).toBe(10000);
    });

    test('should decode token correctly', () => {
      const token = createPaginationToken(50);
      const result = parsePaginationParams({ token });
      expect(result.offset).toBe(50);
    });

    test('should return error for invalid limit', () => {
      const result = parsePaginationParams({ limit: 'invalid' });
      expect(result.error).toBeDefined();
    });
  });

  describe('createPaginationLinks', () => {
    test('should create next link when full page', () => {
      const links = createPaginationLinks('/collections', {}, 0, 10, 10);
      const nextLink = links.find(l => l.rel === 'next');
      expect(nextLink).toBeDefined();
    });

    test('should not create next link when partial page', () => {
      const links = createPaginationLinks('/collections', {}, 0, 10, 5);
      const nextLink = links.find(l => l.rel === 'next');
      expect(nextLink).toBeUndefined();
    });

    test('should create prev link when not first page', () => {
      const links = createPaginationLinks('/collections', {}, 20, 10, 10);
      const prevLink = links.find(l => l.rel === 'prev');
      expect(prevLink).toBeDefined();
    });

    test('should not create prev link on first page', () => {
      const links = createPaginationLinks('/collections', {}, 0, 10, 10);
      const prevLink = links.find(l => l.rel === 'prev');
      expect(prevLink).toBeUndefined();
    });

    test('should always include self link', () => {
      const links = createPaginationLinks('/collections', {}, 0, 10, 10);
      const selfLink = links.find(l => l.rel === 'self');
      expect(selfLink).toBeDefined();
      expect(selfLink.type).toBe('application/json');
    });

    test('should preserve query parameters in links', () => {
      const links = createPaginationLinks('/collections', { sortby: 'title', q: 'sentinel' }, 0, 10, 10);
      const nextLink = links.find(l => l.rel === 'next');
      expect(nextLink.href).toContain('sortby=title');
      expect(nextLink.href).toContain('q=sentinel');
    });

    test('should handle zero offset on prev link calculation', () => {
      const links = createPaginationLinks('/collections', {}, 5, 10, 10);
      const prevLink = links.find(l => l.rel === 'prev');
      expect(prevLink).toBeDefined();
      // prev offset should be max(0, 5-10) = 0
    });

    test('should include limit in next/prev links', () => {
      const links = createPaginationLinks('/collections', {}, 10, 20, 20);
      const nextLink = links.find(l => l.rel === 'next');
      expect(nextLink.href).toContain('limit=20');
    });
  });

  describe('parsePaginationParams - Additional edge cases', () => {
    test('should return error for negative limit', () => {
      const result = parsePaginationParams({ limit: '-10' });
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(400);
      expect(result.error.message).toContain('positive integer');
    });

    test('should return error for zero limit', () => {
      const result = parsePaginationParams({ limit: '0' });
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(400);
    });

    test('should return error for malformed token', () => {
      const result = parsePaginationParams({ token: 'invalid-token' });
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(400);
      expect(result.error.message).toContain('malformed');
    });

    test('should handle custom default limit', () => {
      const result = parsePaginationParams({}, 20, 10000);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    test('should handle custom max limit', () => {
      const result = parsePaginationParams({ limit: '99999' }, 10, 5000);
      expect(result.limit).toBe(5000);
    });

    test('should parse limit as string correctly', () => {
      const result = parsePaginationParams({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    test('should handle float limit by truncating', () => {
      const result = parsePaginationParams({ limit: '10.5' });
      expect(result.limit).toBe(10);
    });

    test('should handle undefined token gracefully', () => {
      const result = parsePaginationParams({ limit: '10' });
      expect(result.offset).toBe(0);
      expect(result.error).toBeNull();
    });

    test('should handle token with zero offset', () => {
      const token = createPaginationToken(0);
      const result = parsePaginationParams({ token });
      expect(result.offset).toBe(0);
    });

    test('should handle large offset in token', () => {
      const token = createPaginationToken(100000);
      const result = parsePaginationParams({ token });
      expect(result.offset).toBe(100000);
    });
  });

  describe('createPaginationToken', () => {
    test('should create valid base64 token', () => {
      const token = createPaginationToken(50);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    test('should be decodable', () => {
      const token = createPaginationToken(100);
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const data = JSON.parse(decoded);
      expect(data.offset).toBe(100);
    });

    test('should create different tokens for different offsets', () => {
      const token1 = createPaginationToken(10);
      const token2 = createPaginationToken(20);
      expect(token1).not.toBe(token2);
    });
  });
});