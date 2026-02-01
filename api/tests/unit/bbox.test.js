const { parseBboxFilter } = require('../../utils/filtering');

describe('BBox Filter Utils', () => {
	describe('parseBboxFilter', () => {
		test('should return null for empty bbox', () => {
			expect(parseBboxFilter()).toEqual({ whereClause: null, params: [], error: null });
			expect(parseBboxFilter(null)).toEqual({ whereClause: null, params: [], error: null });
		});

		test('should parse valid 4-value bbox string', () => {
			const result = parseBboxFilter('10,20,30,40');
			expect(result.error).toBeNull();
			expect(result.params).toEqual([10, 20, 30, 40]);
			expect(result.whereClause).toContain('ST_Intersects');
		});

		test('should parse valid 6-value bbox string (ignore z)', () => {
			const result = parseBboxFilter('10,20,0,30,40,0');
			expect(result.error).toBeNull();
			expect(result.params).toEqual([10, 20, 30, 40]);
			expect(result.whereClause).toContain('ST_Intersects');
		});

		test('should parse valid bbox array', () => {
			const result = parseBboxFilter([10, 20, 30, 40]);
			expect(result.error).toBeNull();
			expect(result.params).toEqual([10, 20, 30, 40]);
		});

		test('should handle anti-meridian crossing', () => {
			const result = parseBboxFilter('170,-10,-170,10');
			expect(result.error).toBeNull();
			expect(result.params.length).toBe(8);
			expect(result.whereClause).toContain('OR');
		});

		test('should return error for invalid format', () => {
			const result = parseBboxFilter('a,b,c,d');
			expect(result.error).toBeDefined();
			expect(result.error.status).toBe(400);
		});

		test('should return error for too few values', () => {
			const result = parseBboxFilter('10,20,30');
			expect(result.error).toBeDefined();
			expect(result.error.status).toBe(400);
		});

		test('should return error for too many values', () => {
			const result = parseBboxFilter('10,20,30,40,50,60,70');
			expect(result.error).toBeDefined();
			expect(result.error.status).toBe(400);
		});

		test('should return error for miny > maxy', () => {
			const result = parseBboxFilter('10,50,30,40');
			expect(result.error).toBeDefined();
			expect(result.error.message).toContain('miny must be <= maxy');
		});

		test('should return error for out-of-range coordinates', () => {
			const result = parseBboxFilter('-200,0,30,40');
			expect(result.error).toBeDefined();
			expect(result.error.message).toContain('Longitude must be -180..180');
		});
	});
});
