//imports 
import pLimit from 'p-limit';

import {
    initializeQueue,
    getNextUrlFromDB,
    hasNextUrl,
    removeFromQueue,
    addToQueue
} from "./queue_manager.js";
import { handleSTACObject } from "./crawler_functions.js"
import { validateStacObject } from "../parsing/json_validator.js";
import { logger } from "./src/config/logger.js"
import { getSTACIndexData } from "../data_management/stac_index_client.js";

const CRAWL_DELAY_MS = 1000; // Polite delay
const MAX_RETRIES = 3;       // Max attempts
const RETRY_DELAY_MS = 2000; // Base backoff time

const CONCURRENCY_LIMIT = 5; // Number of possible parallel processes
const limit = pLimit(CONCURRENCY_LIMIT);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry-aware fetch:
 * - retries: Network errors, 5xx Server Errors, and 429 (Rate Limit) with linear backoff.
 * - aborts fast on fatal 4xx (except 429)
 * - returns parsed JSON on success
 */
async function fetchWithRetry(url, maxRetries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`Fetching ${url} (attempt ${attempt}/${maxRetries})`);
            const response = await fetch(url);
            const status = response.status;
            if (response.ok) return await response.json();
            if (status >= 400 && status < 500 && status !== 429) {
                throw new Error(`Fatal Client Error ${status}: ${response.statusText} - Will not retry.`);
            }
            throw new Error(`Request failed with status ${status}: ${response.statusText}`);
        } catch (error) {
            if (error.message.includes("Fatal Client Error")) throw error;
            logger.warn(`Attempt ${attempt} failed for ${url}: ${error.message}`);
            if (attempt === maxRetries) throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            const delay = RETRY_DELAY_MS * attempt;
            logger.info(`Waiting ${delay}ms before next retry...`);
            await sleep(delay);
        }
    }
}

/**
 * ProcessUrl function:
 * - fetches the JSON from the URL
 * - validates the STAC object structure
 * - handles data persistence and child URL extraction via handleSTACObject
 * - removes the URL from the queue regardless of success or failure (cleanup)
 *
 * @async
 * @function processUrl
 * @param {Object} entry 
 * @returns {Promise<void>}
 */
async function processUrl(entry) {
    const url = entry.url_of_source;
    const parentUrl = entry.parent_url ?? null;

    try {
        // Get the json from the url
        const res = await fetch(url)
        const STACObject = await res.json()

        console.log(`Crawling: ${url}`);
        
        // Only proceed if valid JSON was retrieved
        if (validateStacObject(STACObject).valid) {

            //for Catalogs: put the child urls into the queue
            //for Collections: put the child urls into the queue, save the data in the sources/collections db
            await handleSTACObject(STACObject, url, parentUrl)
    
        } else {
            logger.warn("Warning: Invalid STAC object")
        }
        
    } catch(err) {
        logger.warn(`Warning: Did not crawled the following url: ${url} because of the following error: ${err}`)
    } finally {
        // Remove processed URL from queue to avoid re-processing
        await removeFromQueue(url);
    }
}

/**
 * Run parallel loop:
 * - core crawler loop with parallel execution support
 * - checks for remaining URLs in the database
 * - fetches batches of URLs up to the CONCURRENCY_LIMIT
 * - wraps the processing tasks using p-limit to control concurrency
 * - waits for the current batch to complete before fetching new URLs
 *
 * @async
 * @function runParallelLoop
 * @returns {Promise<void>} Completes when no URLs remain in the queue
 */
async function runParallelLoop() {
    // Continue crawling until no URLs remain in queue
    while (await hasNextUrl()) {
        const batch = [];

        // Batch gets filled until its full or queue is empty
        while (batch.length < CONCURRENCY_LIMIT && await hasNextUrl()) {
            const entry = await getNextUrlFromDB();
            if (entry) {
                const task = limit(() => processUrl(entry));
                batch.push(task);
            }
        }

        if (batch.length === 0) break;

        await Promise.all(batch);
        
         await sleep(CRAWL_DELAY_MS);
    }
}


/**
* Main crawler loop:
* - initializes queue from DB (unrcrawled sources)
* - starts the parallel processing loop
*
* This function implements the core recursive traversal described in the Pflichtenheft.
*
* @async
* @function startCrawler
* @returns {Promise<void>} Completes when no URLs remain in the queue
*/
export async function startCrawler() {

    console.log("Crawler started");

    // Initialize queue from database
    await initializeQueue();

    // Load URLs from STAC Index (fail-safe)
    try {
        const STACIndexData = await getSTACIndexData();
        for (let data of STACIndexData) {
            await addToQueue(data.title, data.url);
        }
    } catch (err) {
        logger.error("Could not load STAC Index data, starting with existing queue only.");
    }

    // Starts the parallel process
   await runParallelLoop();

    console.log("Crawling finished");
}

/**
* Continue crawler-loop:
* - continues crawling if the crawling process stopped because of a network failiure
* - starts the parallel processing loop using existing queue data
*
* @async
* @function continueCrawlingProcess
* @returns {Promise<void>} Completes when no URLs remain in the queue
*/
export async function continueCrawlingProcess() {

    console.log("Crawling Process starts again where it stopped");

    // Starts parallel process
    await runParallelLoop();

    console.log("Crawling finished");
}