import pLimit from "p-limit";

//imports 
import {
    getNextUrlFromDB,
    hasNextUrl,
    removeFromQueueById,
    addToQueue
} from "./queue_manager.js";

import { loadUncrawledSources, isInSources } from "./source_manager.js";
import { handleSTACObject } from "./crawler_functions.js";
import { validateStacObject } from "../parsing/json_validator.js";
import { logger } from "./src/config/logger.js"
import { getSTACIndexData } from "../data_management/stac_index_client.js";

const CRAWL_DELAY_MS = 100; // Polite delay
const MAX_RETRIES = 3;       // Max attempts
const RETRY_DELAY_MS = 2000; // Base backoff time

const CONCURRENCY_LIMIT = 5;
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

async function processUrl(entry, urlData) {
    const url = entry.url_of_source;
    const parentUrl = entry.parent_url ?? null;

    try {
        logger.info(`Crawling: ${url}`);

        const stacObject = await fetchWithRetry(url);

        if (!validateStacObject(stacObject).valid) {
            logger.warn(`Invalid STAC object: ${url}`);
            return;
        }

        const childData = await handleSTACObject(stacObject, url, parentUrl);

        for (const child of childData) {
            urlData.titles.push(child.title);
            urlData.urls.push(child.url);
            urlData.parentUrls.push(url);
        }

    } catch (err) {
        logger.warn(`Failed crawling ${url}: ${err.message}`);
    }
}

async function runParallelLoop() {

    const urlData = {
        titles: [],
        urls: [],
        parentUrls: []
    };

    while (await hasNextUrl()) {

        const batch = [];

        while (batch.length < CONCURRENCY_LIMIT && await hasNextUrl()) {
            const entry = await getNextUrlFromDB();
            if (!entry) break;

            batch.push(
                limit(async () => {
                    await processUrl(entry, urlData);
                    await removeFromQueueById(entry.id);
                })
            );
        }

        if (batch.length === 0) break;

        await Promise.all(batch);

        if (urlData.urls.length > 0) {
            await addToQueue(
                urlData.titles,
                urlData.urls,
                urlData.parentUrls
            );

            urlData.titles = [];
            urlData.urls = [];
            urlData.parentUrls = [];
        }

        await sleep(CRAWL_DELAY_MS);
    }
}

/**
* Main crawler loop:
* - Loads uncrawled sources from DB
* - Strategy A (API): Crawls directly via /collections
* - Strategy B (Static): Adds to queue for recursive processing
*
* @async
* @function startCrawler
* @returns {Promise<void>} Completes when all APIs are done and the static queue is empty
*/
export async function startCrawler() {
    logger.info("Crawler started");

    // 1️⃣ STAC Index EINMAL laden
    try {
        const indexData = await getSTACIndexData();

        const titles = [];
        const urls = [];
        const parents = [];

        for (const data of indexData) {
            titles.push(data.title);
            urls.push(data.url);
            parents.push(null);
        }

        const added = await addToQueue(titles, urls, parents);
        logger.info(`Added ${added} URLs from STAC Index`);

    } catch (err) {
        logger.warn("STAC Index unavailable, continuing with existing queue");
    }

    // 2️⃣ Parallel crawlen
    await runParallelLoop();

    logger.info("Crawling finished");
}

/**
 * Resume crawling using existing queue
 */
export async function continueCrawlingProcess() {
    logger.info("Resuming crawler");
    await runParallelLoop();
    logger.info("Crawling finished");
}
