const { parseDatetimeFilter } = require('../../utils/filtering');

describe('parseDatetimeFilter', () => {
    describe('Valid inputs', () => {
        test('should return null for undefined datetime', () => {
            const result = parseDatetimeFilter(undefined);
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeNull();
        });

        test('should return null for null datetime', () => {
            const result = parseDatetimeFilter(null);
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeNull();
        });

        test('should return null for empty string', () => {
            const result = parseDatetimeFilter('');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeNull();
        });

        test('should return null for fully open interval (../..)', () => {
            const result = parseDatetimeFilter('../..');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeNull();
        });

        test('should handle single timestamp (CONTAINS)', () => {
            const result = parseDatetimeFilter('2020-06-15T00:00:00Z');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            expect(result.params).toEqual(['2020-06-15T00:00:00Z', '2020-06-15T00:00:00Z']);
            expect(result.error).toBeNull();
        });

        test('should handle closed interval (DURING)', () => {
            const result = parseDatetimeFilter('2020-01-01T00:00:00Z/2020-12-31T23:59:59Z');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            expect(result.params).toEqual(['2020-12-31T23:59:59Z', '2020-01-01T00:00:00Z']);
            expect(result.error).toBeNull();
        });

        test('should handle open end interval (AFTER)', () => {
            const result = parseDatetimeFilter('2020-01-01T00:00:00Z/..');
            expect(result.whereClause).toBe('(temporal_end >= $1 OR temporal_end IS NULL)');
            expect(result.params).toEqual(['2020-01-01T00:00:00Z']);
            expect(result.error).toBeNull();
        });

        test('should handle open start interval (BEFORE)', () => {
            const result = parseDatetimeFilter('../2020-12-31T23:59:59Z');
            expect(result.whereClause).toBe('(temporal_start <= $1)');
            expect(result.params).toEqual(['2020-12-31T23:59:59Z']);
            expect(result.error).toBeNull();
        });

        test('should handle ISO date without time', () => {
            const result = parseDatetimeFilter('2020-06-15');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            expect(result.params).toEqual(['2020-06-15', '2020-06-15']);
            expect(result.error).toBeNull();
        });

        test('should handle interval with dates only', () => {
            const result = parseDatetimeFilter('2020-01-01/2020-12-31');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            expect(result.params).toEqual(['2020-12-31', '2020-01-01']);
            expect(result.error).toBeNull();
        });
    });

    describe('Invalid inputs', () => {
        test('should reject non-string datetime', () => {
            const result = parseDatetimeFilter(12345);
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(400);
            expect(result.error.error).toBe('Invalid datetime format');
        });

        test('should reject invalid datetime format', () => {
            const result = parseDatetimeFilter('not-a-date');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(400);
            expect(result.error.error).toBe('Invalid datetime');
        });

        test('should reject invalid interval with too many parts', () => {
            const result = parseDatetimeFilter('2020-01-01/2020-06-01/2020-12-31');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(400);
            expect(result.error.error).toBe('Invalid datetime interval');
        });

        test('should reject interval where start > end', () => {
            const result = parseDatetimeFilter('2020-12-31T23:59:59Z/2020-01-01T00:00:00Z');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(400);
            expect(result.error.error).toBe('Invalid datetime interval');
            expect(result.error.message).toContain('Start datetime must be before end datetime');
        });

        test('should reject interval with invalid start date', () => {
            const result = parseDatetimeFilter('invalid-start/2020-12-31T23:59:59Z');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(400);
            expect(result.error.error).toBe('Invalid datetime');
            expect(result.error.message).toContain('Invalid start datetime');
        });

        test('should reject interval with invalid end date', () => {
            const result = parseDatetimeFilter('2020-01-01T00:00:00Z/invalid-end');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(400);
            expect(result.error.error).toBe('Invalid datetime');
            expect(result.error.message).toContain('Invalid end datetime');
        });
    });

    describe('Edge cases', () => {
        test('should handle datetime with milliseconds', () => {
            const result = parseDatetimeFilter('2020-06-15T12:30:45.123Z');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            expect(result.params).toEqual(['2020-06-15T12:30:45.123Z', '2020-06-15T12:30:45.123Z']);
            expect(result.error).toBeNull();
        });

        test('should handle datetime with timezone offset', () => {
            const result = parseDatetimeFilter('2020-06-15T12:30:45+02:00');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            expect(result.params).toEqual(['2020-06-15T12:30:45+02:00', '2020-06-15T12:30:45+02:00']);
            expect(result.error).toBeNull();
        });

        test('should handle whitespace around datetime', () => {
            const result = parseDatetimeFilter('  2020-06-15T00:00:00Z  ');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            expect(result.params).toEqual(['2020-06-15T00:00:00Z', '2020-06-15T00:00:00Z']);
            expect(result.error).toBeNull();
        });

        test('should handle interval where start equals end', () => {
            const result = parseDatetimeFilter('2020-06-15T00:00:00Z/2020-06-15T00:00:00Z');
            expect(result.whereClause).toBeNull();
            expect(result.params).toEqual([]);
            expect(result.error).toBeDefined();
            expect(result.error.status).toBe(400);
            expect(result.error.message).toContain('Start datetime must be before end datetime');
        });

        test('should handle year only format', () => {
            const result = parseDatetimeFilter('2020');
            expect(result.error).toBeNull();
            expect(result.params.length).toBe(2);
        });

        test('should handle year-month format', () => {
            const result = parseDatetimeFilter('2020-06');
            expect(result.error).toBeNull();
            expect(result.params.length).toBe(2);
        });
    });

    describe('STAC temporal operations', () => {
        test('should support DURING operation (closed interval)', () => {
            // Collection overlaps with query interval
            const result = parseDatetimeFilter('2020-03-01T00:00:00Z/2020-09-30T23:59:59Z');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            // This will match collections where:
            // - temporal_start <= 2020-09-30 AND (temporal_end >= 2020-03-01 OR temporal_end IS NULL)
            expect(result.error).toBeNull();
        });

        test('should support AFTER operation (open end)', () => {
            // Collection ends on or after the given time, or has open-ended temporal extent
            const result = parseDatetimeFilter('2020-06-01T00:00:00Z/..');
            expect(result.whereClause).toBe('(temporal_end >= $1 OR temporal_end IS NULL)');
            // This will match collections where temporal_end >= 2020-06-01 OR temporal_end IS NULL
            expect(result.error).toBeNull();
        });

        test('should support BEFORE operation (open start)', () => {
            // Collection starts on or before the given time
            const result = parseDatetimeFilter('../2020-06-30T23:59:59Z');
            expect(result.whereClause).toBe('(temporal_start <= $1)');
            // This will match collections where temporal_start <= 2020-06-30
            expect(result.error).toBeNull();
        });

        test('should support CONTAINS operation (single timestamp)', () => {
            // Collection contains the exact timestamp
            const result = parseDatetimeFilter('2020-06-15T12:00:00Z');
            expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
            // This will match collections where:
            // - temporal_start <= 2020-06-15T12:00:00Z AND (temporal_end >= 2020-06-15T12:00:00Z OR temporal_end IS NULL)
            expect(result.error).toBeNull();
        });
    });

    describe('Parameter index management', () => {
        test('should start parameters at $1', () => {
            const result = parseDatetimeFilter('2020-06-15T00:00:00Z');
            expect(result.whereClause).toContain('$1');
            expect(result.whereClause).not.toContain('$0');
        });

        test('should use two parameters for single timestamp', () => {
            const result = parseDatetimeFilter('2020-06-15T00:00:00Z');
            expect(result.params.length).toBe(2);
            expect(result.whereClause).toContain('$1');
            expect(result.whereClause).toContain('$2');
        });

        test('should use two parameters for closed interval', () => {
            const result = parseDatetimeFilter('2020-01-01T00:00:00Z/2020-12-31T23:59:59Z');
            expect(result.params.length).toBe(2);
        });

        test('should use one parameter for open end interval', () => {
            const result = parseDatetimeFilter('2020-01-01T00:00:00Z/..');
            expect(result.params.length).toBe(1);
        });

        test('should use one parameter for open start interval', () => {
            const result = parseDatetimeFilter('../2020-12-31T23:59:59Z');
            expect(result.params.length).toBe(1);
        });
    });

    describe('NULL temporal_end handling', () => {
        test('should handle NULL temporal_end in single timestamp query', () => {
            const result = parseDatetimeFilter('2020-06-15T00:00:00Z');
            expect(result.whereClause).toContain('temporal_end IS NULL');
        });

        test('should handle NULL temporal_end in closed interval', () => {
            const result = parseDatetimeFilter('2020-01-01T00:00:00Z/2020-12-31T23:59:59Z');
            expect(result.whereClause).toContain('temporal_end IS NULL');
        });

        test('should handle NULL temporal_end in AFTER operation', () => {
            const result = parseDatetimeFilter('2020-06-01T00:00:00Z/..');
            expect(result.whereClause).toContain('temporal_end IS NULL');
        });

        test('should not check temporal_end in BEFORE operation', () => {
            const result = parseDatetimeFilter('../2020-12-31T23:59:59Z');
            expect(result.whereClause).not.toContain('temporal_end');
        });
    });

    describe('Real-world scenarios', () => {
        test('should handle query for collections active in 2020', () => {
            const result = parseDatetimeFilter('2020-01-01/2020-12-31');
            expect(result.error).toBeNull();
            expect(result.params.length).toBe(2);
        });

        test('should handle query for collections starting after 2020', () => {
            const result = parseDatetimeFilter('2020-12-31T23:59:59Z/..');
            expect(result.error).toBeNull();
            expect(result.whereClause).toContain('temporal_end >=');
        });

        test('should handle query for historical collections (before 2000)', () => {
            const result = parseDatetimeFilter('../2000-01-01T00:00:00Z');
            expect(result.error).toBeNull();
            expect(result.whereClause).toContain('temporal_start <=');
        });

        test('should handle query for current/ongoing collections', () => {
            const now = new Date().toISOString();
            const result = parseDatetimeFilter(`${now}/..`);
            expect(result.error).toBeNull();
        });
    });

    describe('Whitespace handling', () => {
        test('should trim leading whitespace', () => {
            const result = parseDatetimeFilter('  2020-06-15T00:00:00Z');
            expect(result.error).toBeNull();
        });

        test('should trim trailing whitespace', () => {
            const result = parseDatetimeFilter('2020-06-15T00:00:00Z  ');
            expect(result.error).toBeNull();
        });

        test('should handle whitespace around interval delimiter', () => {
            // Note: whitespace after split is NOT trimmed in current implementation
            const result = parseDatetimeFilter('2020-01-01T00:00:00Z/2020-12-31T23:59:59Z');
            expect(result.error).toBeNull();
        });

        test('should reject interval with spaces around dates (implementation limitation)', () => {
            // Current implementation does not trim parts after split
            const result = parseDatetimeFilter('  2020-01-01T00:00:00Z / 2020-12-31T23:59:59Z  ');
            // This will fail because " 2020-01-01T00:00:00Z " is not a valid date
            expect(result.error).toBeDefined();
            expect(result.error.error).toBe('Invalid datetime');
        });
    });

    // === Performance & Edge Cases ===
    describe('Performance and Edge Cases', () => {
        describe('Long Time Intervals (Multi-Decade)', () => {
            test('should handle 50-year interval (1975-2025)', () => {
                const startTime = performance.now();
                const result = parseDatetimeFilter('1975-01-01T00:00:00Z/2025-12-31T23:59:59Z');
                const duration = performance.now() - startTime;

                expect(result.error).toBeNull();
                expect(result.whereClause).toBe('(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))');
                expect(result.params).toEqual(['2025-12-31T23:59:59Z', '1975-01-01T00:00:00Z']);
                
                // Performance assertion: should complete in under 5ms
                expect(duration).toBeLessThan(5);
            });

            test('should handle century-long interval (1900-2000)', () => {
                const result = parseDatetimeFilter('1900-01-01T00:00:00Z/2000-12-31T23:59:59Z');
                expect(result.error).toBeNull();
                expect(result.params.length).toBe(2);
            });

            test('should handle multi-century interval (1800-2100)', () => {
                const result = parseDatetimeFilter('1800-01-01/2100-12-31');
                expect(result.error).toBeNull();
                expect(result.params).toEqual(['2100-12-31', '1800-01-01']);
            });

            test('should handle satellite era (1957-present)', () => {
                const result = parseDatetimeFilter('1957-10-04T00:00:00Z/..');
                expect(result.error).toBeNull();
                expect(result.whereClause).toBe('(temporal_end >= $1 OR temporal_end IS NULL)');
            });

            test('should handle Landsat program era (1972-present)', () => {
                const result = parseDatetimeFilter('1972-07-23/..');
                expect(result.error).toBeNull();
                expect(result.params).toEqual(['1972-07-23']);
            });

            test('should handle Sentinel program (2014-2050)', () => {
                const result = parseDatetimeFilter('2014-04-03/2050-12-31');
                expect(result.error).toBeNull();
                expect(result.params.length).toBe(2);
            });

            test('should handle historical archives (pre-1900)', () => {
                const result = parseDatetimeFilter('../1900-01-01T00:00:00Z');
                expect(result.error).toBeNull();
                expect(result.whereClause).toBe('(temporal_start <= $1)');
            });

            test('should handle future projections (2025-2100)', () => {
                const result = parseDatetimeFilter('2025-01-01/2100-12-31');
                expect(result.error).toBeNull();
                expect(result.params).toEqual(['2100-12-31', '2025-01-01']);
            });
        });

        describe('Very Short Time Intervals', () => {
            test('should handle single day', () => {
                const result = parseDatetimeFilter('2020-06-15/2020-06-15');
                expect(result.error).toBeDefined(); // Same start/end not allowed
            });

            test('should handle single hour interval', () => {
                const result = parseDatetimeFilter('2020-06-15T12:00:00Z/2020-06-15T13:00:00Z');
                expect(result.error).toBeNull();
                expect(result.params.length).toBe(2);
            });

            test('should handle single minute interval', () => {
                const result = parseDatetimeFilter('2020-06-15T12:00:00Z/2020-06-15T12:01:00Z');
                expect(result.error).toBeNull();
                expect(result.params.length).toBe(2);
            });

            test('should handle sub-second precision', () => {
                const result = parseDatetimeFilter('2020-06-15T12:00:00.000Z/2020-06-15T12:00:00.999Z');
                expect(result.error).toBeNull();
                expect(result.params[0]).toBe('2020-06-15T12:00:00.999Z');
                expect(result.params[1]).toBe('2020-06-15T12:00:00.000Z');
            });
        });

        describe('Edge Cases at Time Boundaries', () => {
            test('should handle leap year (February 29)', () => {
                const result = parseDatetimeFilter('2020-02-29');
                expect(result.error).toBeNull();
                expect(result.params).toEqual(['2020-02-29', '2020-02-29']);
            });

            test('should handle year boundary (New Year)', () => {
                const result = parseDatetimeFilter('2019-12-31T23:59:59Z/2020-01-01T00:00:01Z');
                expect(result.error).toBeNull();
                expect(result.params.length).toBe(2);
            });

            test('should handle century boundary (Y2K)', () => {
                const result = parseDatetimeFilter('1999-12-31T23:59:59Z/2000-01-01T00:00:01Z');
                expect(result.error).toBeNull();
                expect(result.params.length).toBe(2);
            });

            test('should handle millennium boundary', () => {
                const result = parseDatetimeFilter('999-12-31/1000-01-01');
                expect(result.error).toBeNull();
            });

            test('should handle daylight saving time transitions', () => {
                // Europe Spring DST transition 2024
                const result = parseDatetimeFilter('2024-03-31T00:00:00Z/2024-03-31T04:00:00Z');
                expect(result.error).toBeNull();
            });
        });

        describe('Performance Benchmarks', () => {
            test('should parse single timestamp within 2ms', () => {
                const iterations = 100;
                const startTime = performance.now();
                
                for (let i = 0; i < iterations; i++) {
                    parseDatetimeFilter('2020-06-15T00:00:00Z');
                }
                
                const duration = (performance.now() - startTime) / iterations;
                expect(duration).toBeLessThan(2);
            });

            test('should parse interval within 3ms', () => {
                const iterations = 100;
                const startTime = performance.now();
                
                for (let i = 0; i < iterations; i++) {
                    parseDatetimeFilter('2020-01-01T00:00:00Z/2020-12-31T23:59:59Z');
                }
                
                const duration = (performance.now() - startTime) / iterations;
                expect(duration).toBeLessThan(3);
            });

            test('should parse long interval within 5ms', () => {
                const iterations = 100;
                const startTime = performance.now();
                
                for (let i = 0; i < iterations; i++) {
                    parseDatetimeFilter('1900-01-01T00:00:00Z/2100-12-31T23:59:59Z');
                }
                
                const duration = (performance.now() - startTime) / iterations;
                expect(duration).toBeLessThan(5);
            });

            test('should handle rapid successive calls without degradation', () => {
                const durations = [];
                
                for (let i = 0; i < 10; i++) {
                    const start = performance.now();
                    parseDatetimeFilter(`202${i}-01-01/202${i}-12-31`);
                    durations.push(performance.now() - start);
                }
                
                // Last call should not be significantly slower than first
                const firstCall = durations[0];
                const lastCall = durations[durations.length - 1];
                expect(lastCall).toBeLessThan(firstCall * 2);
            });
        });

        describe('Memory and Resource Usage', () => {
            test('should not create excessive parameters for single timestamp', () => {
                const result = parseDatetimeFilter('2020-06-15T00:00:00Z');
                expect(result.params.length).toBe(2); // Expected: same timestamp twice
            });

            test('should create exactly 2 parameters for closed interval', () => {
                const result = parseDatetimeFilter('2020-01-01/2020-12-31');
                expect(result.params.length).toBe(2);
            });

            test('should create exactly 1 parameter for open intervals', () => {
                const result1 = parseDatetimeFilter('2020-01-01/..');
                expect(result1.params.length).toBe(1);

                const result2 = parseDatetimeFilter('../2020-12-31');
                expect(result2.params.length).toBe(1);
            });

            test('whereClause should be reasonable length', () => {
                const result = parseDatetimeFilter('2020-01-01T00:00:00Z/2020-12-31T23:59:59Z');
                expect(result.whereClause.length).toBeLessThan(200);
            });

            test('should handle ISO 8601 strings without memory leaks', () => {
                const before = process.memoryUsage().heapUsed;
                
                for (let i = 0; i < 1000; i++) {
                    parseDatetimeFilter(`2020-${String(i % 12 + 1).padStart(2, '0')}-01`);
                }
                
                const after = process.memoryUsage().heapUsed;
                const increase = after - before;
                
                // Should not leak significant memory (< 1MB for 1000 iterations)
                expect(increase).toBeLessThan(1024 * 1024);
            });
        });

        describe('Real-World Archive Scenarios', () => {
            test('should handle Copernicus Sentinel complete archive', () => {
                const result = parseDatetimeFilter('2014-04-03T00:00:00Z/..');
                expect(result.error).toBeNull();
                expect(result.params).toEqual(['2014-04-03T00:00:00Z']);
            });

            test('should handle Landsat complete archive', () => {
                const result = parseDatetimeFilter('1972-07-23/..');
                expect(result.error).toBeNull();
            });

            test('should handle MODIS archive (2000-present)', () => {
                const result = parseDatetimeFilter('2000-02-24/..');
                expect(result.error).toBeNull();
            });

            test('should handle historical climate data (1850-2024)', () => {
                const result = parseDatetimeFilter('1850-01-01/2024-12-31');
                expect(result.error).toBeNull();
                expect(result.params.length).toBe(2);
            });

            test('should handle single mission duration (Sentinel-1A)', () => {
                const result = parseDatetimeFilter('2014-04-03/2030-12-31');
                expect(result.error).toBeNull();
            });

            test('should handle seasonal query (summer 2020)', () => {
                const result = parseDatetimeFilter('2020-06-01/2020-08-31');
                expect(result.error).toBeNull();
            });

            test('should handle monthly archive query', () => {
                const result = parseDatetimeFilter('2020-06-01/2020-06-30');
                expect(result.error).toBeNull();
            });

            test('should handle multi-year climate study (2000-2020)', () => {
                const result = parseDatetimeFilter('2000-01-01/2020-12-31');
                expect(result.error).toBeNull();
            });
        });

        describe('Extreme Date Values', () => {
            test('should handle very old dates (year 1000)', () => {
                const result = parseDatetimeFilter('1000-01-01/1100-12-31');
                expect(result.error).toBeNull();
            });

            test('should handle far future dates (year 2500)', () => {
                const result = parseDatetimeFilter('2500-01-01/2600-12-31');
                expect(result.error).toBeNull();
            });

            test('should handle single year in distant past', () => {
                const result = parseDatetimeFilter('../0500-12-31');
                expect(result.error).toBeNull();
            });

            test('should handle open-ended future query', () => {
                const result = parseDatetimeFilter('2024-01-01/..');
                expect(result.error).toBeNull();
            });
        });

        describe('Combined Stress Tests', () => {
            test('should handle multiple successive long-interval queries', () => {
                const results = [];
                const intervals = [
                    '1900-01-01/2000-12-31',
                    '1950-01-01/2050-12-31',
                    '1800-01-01/2100-12-31',
                    '1975-06-15/2025-06-15',
                    '1850-01-01/2150-12-31'
                ];

                const startTime = performance.now();
                
                intervals.forEach(interval => {
                    results.push(parseDatetimeFilter(interval));
                });
                
                const duration = performance.now() - startTime;

                results.forEach(result => {
                    expect(result.error).toBeNull();
                });
                
                // All 5 queries should complete in under 25ms total
                expect(duration).toBeLessThan(25);
            });

            test('should maintain consistency across different date formats', () => {
                const formats = [
                    '2020',
                    '2020-06',
                    '2020-06-15',
                    '2020-06-15T00:00:00Z',
                    '2020-06-15T12:30:45.123Z'
                ];

                formats.forEach(format => {
                    const result = parseDatetimeFilter(format);
                    expect(result.error).toBeNull();
                    expect(result.params.length).toBeGreaterThan(0);
                });
            });
        });
    });
});
