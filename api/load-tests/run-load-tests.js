#!/usr/bin/env node

/**
 * Load Testing Script with autocannon
 * 
 * Tests various API endpoints under load to identify performance bottlenecks.
 * 
 * Usage:
 *   npm run load-test
 *   or
 *   node load-tests/run-load-tests.js
 * 
 * Prerequisites:
 *   - API must be running on http://localhost:4000
 *   - Database must be accessible
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const DURATION = 30; // seconds per test
const CONNECTIONS = 10; // concurrent connections
const PIPELINING = 1; // requests per connection

// Test scenarios
const scenarios = [
    {
        name: 'Baseline - GET /collections (default pagination)',
        url: `${BASE_URL}/collections`,
        description: 'Simple collection listing without filters',
    },
    {
        name: 'Pagination - GET /collections?limit=50',
        url: `${BASE_URL}/collections?limit=50`,
        description: 'Larger page size to test pagination performance',
    },
    {
        name: 'Free Text Search - GET /collections?q=sentinel',
        url: `${BASE_URL}/collections?q=sentinel`,
        description: 'Full-text search performance',
    },
    {
        name: 'BBox Filter - GET /collections?bbox=5,47,15,55',
        url: `${BASE_URL}/collections?bbox=5.0,47.0,15.0,55.0`,
        description: 'Spatial filtering with bounding box',
    },
    {
        name: 'Datetime Filter - GET /collections?datetime=2020-01-01/..',
        url: `${BASE_URL}/collections?datetime=2020-01-01T00:00:00Z/..`,
        description: 'Temporal filtering',
    },
    {
        name: 'Combined Filters - q + bbox + datetime',
        url: `${BASE_URL}/collections?q=sentinel&bbox=5.0,47.0,15.0,55.0&datetime=2020-01-01T00:00:00Z/..`,
        description: 'Multiple filters combined',
    },
    {
        name: 'CQL2 Filter - JSON',
        url: `${BASE_URL}/collections?filter-lang=cql2-json&filter=${encodeURIComponent(JSON.stringify({
            op: 'like',
            args: [{ property: 'title' }, 'Sentinel%']
        }))}`,
        description: 'CQL2-json filter performance',
    },
    {
        name: 'Sorting - GET /collections?sortby=title',
        url: `${BASE_URL}/collections?sortby=title&limit=20`,
        description: 'Sorting performance',
    },
    {
        name: 'Combined Query - All parameters',
        url: `${BASE_URL}/collections?q=sentinel&bbox=5.0,47.0,15.0,55.0&datetime=2020-01-01T00:00:00Z/..&sortby=title&limit=10`,
        description: 'Maximum complexity query',
    },
];

// Results storage
const results = {
    timestamp: new Date().toISOString(),
    duration: DURATION,
    connections: CONNECTIONS,
    baseUrl: BASE_URL,
    scenarios: [],
};

/**
 * Run a single load test scenario
 */
async function runScenario(scenario) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 Running: ${scenario.name}`);
    console.log(`   URL: ${scenario.url}`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`${'='.repeat(80)}\n`);

    return new Promise((resolve, reject) => {
        const instance = autocannon({
            url: scenario.url,
            duration: DURATION,
            connections: CONNECTIONS,
            pipelining: PIPELINING,
            bailout: 1000, // Stop if 1000 errors occur
        }, (err, result) => {
            if (err) {
                console.error(`Error in scenario "${scenario.name}":`, err);
                reject(err);
            } else {
                // Print results
                console.log(autocannon.printResult(result));

                // Store results
                const scenarioResult = {
                    name: scenario.name,
                    url: scenario.url,
                    description: scenario.description,
                    requests: {
                        total: result.requests.total,
                        average: result.requests.average,
                        mean: result.requests.mean,
                        stddev: result.requests.stddev,
                        min: result.requests.min,
                        max: result.requests.max,
                        p50: result.requests.p50,
                        p75: result.requests.p75,
                        p90: result.requests.p90,
                        p99: result.requests.p99,
                        p999: result.requests.p999,
                    },
                    latency: {
                        average: result.latency.mean,
                        mean: result.latency.mean,
                        stddev: result.latency.stddev,
                        min: result.latency.min,
                        max: result.latency.max,
                        p50: result.latency.p50,
                        p75: result.latency.p75,
                        p90: result.latency.p90,
                        p99: result.latency.p99,
                        p999: result.latency.p999,
                    },
                    throughput: {
                        average: result.throughput.mean,
                        mean: result.throughput.mean,
                        stddev: result.throughput.stddev,
                        min: result.throughput.min,
                        max: result.throughput.max,
                    },
                    errors: result.errors,
                    timeouts: result.timeouts,
                    duration: result.duration,
                    start: result.start,
                    finish: result.finish,
                    non2xx: result.non2xx || 0,
                };

                results.scenarios.push(scenarioResult);
                resolve(scenarioResult);
            }
        });

        // Track progress
        autocannon.track(instance, { renderProgressBar: true });
    });
}

/**
 * Generate summary report
 */
function generateSummary() {
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('LOAD TEST SUMMARY');
    console.log(`${'='.repeat(80)}\n`);

    console.log(`Test Duration: ${DURATION}s per scenario`);
    console.log(`Concurrent Connections: ${CONNECTIONS}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Total Scenarios: ${results.scenarios.length}\n`);

    // Summary table
    console.log('┌─────────────────────────────────────────────┬──────────┬───────────┬──────────┬─────────┐');
    console.log('│ Scenario                                    │ Req/sec  │ Latency   │ Errors   │ p99     │');
    console.log('│                                             │          │ (avg ms)  │          │ (ms)    │');
    console.log('├─────────────────────────────────────────────┼──────────┼───────────┼──────────┼─────────┤');

    results.scenarios.forEach(scenario => {
        const name = scenario.name.substring(0, 43).padEnd(43);
        const reqSec = scenario.requests.mean.toFixed(1).padStart(8);
        const latency = scenario.latency.mean.toFixed(2).padStart(9);
        const errors = (scenario.errors + scenario.non2xx).toString().padStart(8);
        const p99 = scenario.latency.p99.toFixed(2).padStart(7);

        console.log(`│ ${name} │ ${reqSec} │ ${latency} │ ${errors} │ ${p99} │`);
    });

    console.log('└─────────────────────────────────────────────┴──────────┴───────────┴──────────┴─────────┘\n');

    // Identify bottlenecks
    console.log('BOTTLENECK ANALYSIS\n');

    // Slowest endpoint
    const slowest = results.scenarios.reduce((prev, curr) =>
        curr.latency.mean > prev.latency.mean ? curr : prev
    );
    console.log(`   Slowest Endpoint: ${slowest.name}`);
    console.log(`   Average Latency: ${slowest.latency.mean.toFixed(2)}ms\n`);

    // Fastest endpoint
    const fastest = results.scenarios.reduce((prev, curr) =>
        curr.latency.mean < prev.latency.mean ? curr : prev
    );
    console.log(`   Fastest Endpoint: ${fastest.name}`);
    console.log(`   Average Latency: ${fastest.latency.mean.toFixed(2)}ms\n`);

    // Highest throughput
    const highestThroughput = results.scenarios.reduce((prev, curr) =>
        curr.requests.mean > prev.requests.mean ? curr : prev
    );
    console.log(`   Highest Throughput: ${highestThroughput.name}`);
    console.log(`   Requests/sec: ${highestThroughput.requests.mean.toFixed(1)}\n`);

    // Most errors
    const mostErrors = results.scenarios.reduce((prev, curr) => {
        const prevTotal = prev.errors + (prev.non2xx || 0);
        const currTotal = curr.errors + (curr.non2xx || 0);
        return currTotal > prevTotal ? curr : prev;
    });
    const totalErrors = mostErrors.errors + (mostErrors.non2xx || 0);
    if (totalErrors > 0) {
        console.log(`   Most Errors: ${mostErrors.name}`);
        console.log(`   Total Errors: ${totalErrors}\n`);
    }

    // Recommendations
    console.log('RECOMMENDATIONS\n');

    if (slowest.latency.mean > 500) {
        console.log('   High latency detected (>500ms):');
        console.log('      - Consider adding database indexes');
        console.log('      - Implement caching for expensive queries');
        console.log('      - Optimize complex filter queries\n');
    }

    if (totalErrors > results.scenarios[0].requests.total * 0.01) {
        console.log('   Error rate >1%:');
        console.log('      - Check database connection pool settings');
        console.log('      - Review error logs for patterns');
        console.log('      - Consider implementing circuit breakers\n');
    }

    const avgLatency = results.scenarios.reduce((sum, s) => sum + s.latency.mean, 0) / results.scenarios.length;
    if (avgLatency < 100) {
        console.log('   Excellent performance (avg latency <100ms)');
    } else if (avgLatency < 300) {
        console.log('    Good performance (avg latency <300ms)');
    } else {
        console.log('     Performance could be improved (avg latency >' + avgLatency.toFixed(0) + 'ms)');
    }

    console.log(`\n${'='.repeat(80)}\n`);
}

/**
 * Save results to JSON file
 */
function saveResults() {
    const outputDir = path.join(__dirname, 'results');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(outputDir, `load-test-${timestamp}.json`);

    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(` Results saved to: ${filename}\n`);

    return filename;
}

/**
 * Main execution
 */
async function main() {
    console.log('\n STAC Finder API - Load Testing\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Duration: ${DURATION}s per scenario`);
    console.log(`Connections: ${CONNECTIONS}`);
    console.log(`Scenarios: ${scenarios.length}\n`);

    // Check if API is reachable
    console.log('Checking API availability...');
    try {
        const http = require('http');
        await new Promise((resolve, reject) => {
            const req = http.get(`${BASE_URL}/health`, (res) => {
                if (res.statusCode === 200) {
                    console.log(' API is reachable\n');
                    resolve();
                } else {
                    reject(new Error(`API returned status ${res.statusCode}`));
                }
            });
            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Connection timeout'));
            });
        });
    } catch (err) {
        console.error(` Cannot reach API at ${BASE_URL}`);
        console.error('   Make sure the API is running: npm start');
        console.error(`   Error: ${err.message}\n`);
        process.exit(1);
    }

    // Run all scenarios sequentially
    for (const scenario of scenarios) {
        try {
            await runScenario(scenario);
            // Wait 5 seconds between tests to let system recover
            console.log('\n Waiting 5 seconds before next test...\n');
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (err) {
            console.error(`Failed to run scenario: ${scenario.name}`, err);
        }
    }

    // Generate summary
    generateSummary();

    // Save results
    saveResults();

    console.log(' Load testing complete!\n');
    process.exit(0);
}

// Run if executed directly
if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { runScenario, scenarios };
