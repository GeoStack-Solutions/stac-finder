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

	// === Performance & Edge Cases ===
	describe('Performance and Edge Cases', () => {
		describe('Large Bounding Boxes', () => {
			test('should handle global bbox (-180,-90,180,90)', () => {
				const startTime = performance.now();
				const result = parseBboxFilter('-180,-90,180,90');
				const duration = performance.now() - startTime;

				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, -90, 180, 90]);
				expect(result.whereClause).toContain('ST_Intersects');
				
				// Performance assertion: should complete in under 5ms
				expect(duration).toBeLessThan(5);
			});

			test('should handle entire Western Hemisphere', () => {
				const result = parseBboxFilter('-180,-90,0,90');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, -90, 0, 90]);
			});

			test('should handle entire Eastern Hemisphere', () => {
				const result = parseBboxFilter('0,-90,180,90');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([0, -90, 180, 90]);
			});

			test('should handle entire Northern Hemisphere', () => {
				const result = parseBboxFilter('-180,0,180,90');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, 0, 180, 90]);
			});

			test('should handle entire Southern Hemisphere', () => {
				const result = parseBboxFilter('-180,-90,180,0');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, -90, 180, 0]);
			});

			test('should handle Pacific Ocean spanning bbox', () => {
				const result = parseBboxFilter('120,-60,-120,60');
				expect(result.error).toBeNull();
				// Should trigger anti-meridian handling
				expect(result.params.length).toBe(8);
				expect(result.whereClause).toContain('OR');
			});

			test('should handle continental-scale bbox (Europe)', () => {
				const result = parseBboxFilter('-10,36,40,71');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-10, 36, 40, 71]);
			});

			test('should handle continental-scale bbox (Africa)', () => {
				const result = parseBboxFilter('-18,-35,52,37');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-18, -35, 52, 37]);
			});
		});

		describe('Very Small Bounding Boxes (Precision Tests)', () => {
			test('should handle city-scale bbox (Berlin)', () => {
				const result = parseBboxFilter('13.088,52.338,13.761,52.675');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([13.088, 52.338, 13.761, 52.675]);
			});

			test('should handle street-scale bbox (sub-kilometer)', () => {
				const result = parseBboxFilter('13.404,52.520,13.406,52.522');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([13.404, 52.520, 13.406, 52.522]);
			});

			test('should handle very precise coordinates (6 decimals)', () => {
				const result = parseBboxFilter('13.404567,52.520008,13.404789,52.520123');
				expect(result.error).toBeNull();
				expect(result.params[0]).toBeCloseTo(13.404567, 6);
				expect(result.params[1]).toBeCloseTo(52.520008, 6);
			});

			test('should handle minimal bbox (meter-scale precision)', () => {
				const result = parseBboxFilter('0,0,0.00001,0.00001');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([0, 0, 0.00001, 0.00001]);
			});
		});

		describe('Edge Cases at Boundaries', () => {
			test('should handle bbox at North Pole', () => {
				const result = parseBboxFilter('-180,85,180,90');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, 85, 180, 90]);
			});

			test('should handle bbox at South Pole', () => {
				const result = parseBboxFilter('-180,-90,180,-85');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, -90, 180, -85]);
			});

			test('should handle bbox crossing Equator', () => {
				const result = parseBboxFilter('0,-10,10,10');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([0, -10, 10, 10]);
			});

			test('should handle bbox at Prime Meridian', () => {
				const result = parseBboxFilter('-5,45,5,55');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-5, 45, 5, 55]);
			});

			test('should handle bbox at exact boundaries', () => {
				const result = parseBboxFilter('-180,-90,180,90');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, -90, 180, 90]);
			});

			test('should handle bbox touching anti-meridian from west', () => {
				const result = parseBboxFilter('170,-10,180,10');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([170, -10, 180, 10]);
			});

			test('should handle bbox touching anti-meridian from east', () => {
				const result = parseBboxFilter('-180,-10,-170,10');
				expect(result.error).toBeNull();
				expect(result.params).toEqual([-180, -10, -170, 10]);
			});
		});

		describe('Performance Benchmarks', () => {
			test('should parse standard bbox within 2ms', () => {
				const iterations = 100;
				const startTime = performance.now();
				
				for (let i = 0; i < iterations; i++) {
					parseBboxFilter('10,20,30,40');
				}
				
				const duration = (performance.now() - startTime) / iterations;
				expect(duration).toBeLessThan(2);
			});

			test('should parse anti-meridian bbox within 5ms', () => {
				const iterations = 100;
				const startTime = performance.now();
				
				for (let i = 0; i < iterations; i++) {
					parseBboxFilter('170,-10,-170,10');
				}
				
				const duration = (performance.now() - startTime) / iterations;
				expect(duration).toBeLessThan(5);
			});

			test('should handle rapid successive calls without degradation', () => {
				const durations = [];
				
				for (let i = 0; i < 10; i++) {
					const start = performance.now();
					parseBboxFilter(`${i},${i},${i+10},${i+10}`);
					durations.push(performance.now() - start);
				}
				
				// Last call should not be significantly slower than first
				const firstCall = durations[0];
				const lastCall = durations[durations.length - 1];
				expect(lastCall).toBeLessThan(firstCall * 2);
			});
		});

		describe('Memory and Resource Usage', () => {
			test('should not create excessive parameters for simple bbox', () => {
				const result = parseBboxFilter('10,20,30,40');
				expect(result.params.length).toBe(4);
			});

			test('should handle anti-meridian with exactly 8 parameters', () => {
				const result = parseBboxFilter('170,-10,-170,10');
				expect(result.params.length).toBe(8);
			});

			test('whereClause should be reasonable length for simple bbox', () => {
				const result = parseBboxFilter('10,20,30,40');
				expect(result.whereClause.length).toBeLessThan(500);
			});

			test('whereClause should be reasonable length even for anti-meridian', () => {
				const result = parseBboxFilter('170,-10,-170,10');
				// Anti-meridian creates two bboxes, but should still be reasonable
				expect(result.whereClause.length).toBeLessThan(1000);
			});
		});

		describe('Real-World Scenarios', () => {
			test('should handle satellite imagery typical extent (Landsat scene)', () => {
				const result = parseBboxFilter('-122.5,37.5,-121.5,38.5');
				expect(result.error).toBeNull();
			});

			test('should handle Sentinel-2 tile extent (~110km)', () => {
				const result = parseBboxFilter('10,50,11,51');
				expect(result.error).toBeNull();
			});

			test('should handle country-scale query (Germany)', () => {
				const result = parseBboxFilter('5.866,47.270,15.042,55.099');
				expect(result.error).toBeNull();
			});

			test('should handle oceanic region (North Atlantic)', () => {
				const result = parseBboxFilter('-80,20,-20,60');
				expect(result.error).toBeNull();
			});
		});
	});
});
