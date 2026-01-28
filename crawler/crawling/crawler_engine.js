//imports 
import {
    initializeQueue,
    getNextUrlFromDB,
    hasNextUrl,
    removeFromQueue,
    addToQueue
} from "./queue_manager.js";

import { loadUncrawledSources } from "./source_manager.js";
import { handleSTACObject, crawlStacApi, validateQueueEntry } from "./crawler_functions.js"
import { validateStacObject } from "../parsing/json_validator.js";
import { logger } from "./src/config/logger.js"
import { getSTACIndexData } from "../data_management/stac_index_client.js";
import { isInSources } from "./source_manager.js";

const CRAWL_DELAY_MS = 100; // Polite delay
const MAX_RETRIES = 3;       // Max attempts
const RETRY_DELAY_MS = 2000; // Base backoff time

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
 
    // we now load sources manually to check their type.
    const sources = await loadUncrawledSources(); //
    
    logger.info(`Found ${sources.length} sources to process.`);

    //initialize Arrays to store uncrawled Sources before upload
    let uncrawledTitles = []
    let uncrawledUrls = []

    for (const source of sources) {
        if (source.type === 'API') {
            // Process directly, no queue needed for the collections list
            await crawlStacApi(source); //
        } else {
            //validate data
            if (validateQueueEntry(source.title, source.url)) {

                //add the data to the array
                uncrawledTitles.push(source.title)
                uncrawledUrls.push(source.url)
            }
        }
    }

    //push uncrawled sources to the queue
    await addToQueue(uncrawledTitles, uncrawledUrls); //

    // Load URLs from STAC Index (fail-safe)
    try {

        //get the data from the STAC Index Database
        const STACIndexData = await getSTACIndexData();

        //initialize arrays to store data
        let titles = []
        let urls = []

        //bring the data in the format needed to add it to the queue
        for (let data of STACIndexData) {

            //validate data
            if (validateQueueEntry(data.title, data.url)) {

                //add the data to the array
                titles.push(data.title)
                urls.push(data.url)
            }
        }

        //make sure that the length of the arrays is equal
        //otherwise the data could get mixed up
        if (titles.length == urls.length) {

            //add the data to the queue
            addToQueue(titles, urls)

        } else {
            logger.error(`There are ${titles.length} titles but ${urls.length} urls you want to add to the queue.`)
            throw err
        }

    } catch (err) {
        logger.error("Could not load STAC Index data, starting with existing queue only.");
    }

    //Store the data to upload it later to the queue 
    const urlData = {
        titles : [],
        urls : [],
        parentUrls : []
    }

    // Continue crawling until no URLs remain in queue
    while (await hasNextUrl()) {

        // Fetch next URL entry from queue table
            const entry = await getNextUrlFromDB();
            const url = entry.url_of_source;
            const parentUrl = entry.parent_url ?? null;

        try {
            // Fetch STAC JSON with retry
            const STACObject = await fetchWithRetry(url)
            logger.info(`Crawling: ${url}`);
            
            // Only proceed if valid JSON was retrieved
            if (validateStacObject(STACObject).valid) {

                //for Catalogs: get the child data and save the catalog data in the sources db
                //for Collections: get the child data, save the collection data in the collections and the sources db
                const childData = await handleSTACObject(STACObject, url, parentUrl)

                for(let child of childData) {

                    //validate child data
                    if(validateQueueEntry(child.title, child.url, parentUrl)) {

                        //add the child data to the urlData
                        urlData.titles.push(child.title)
                        urlData.urls.push(child.url)
                        urlData.parentUrls.push(parentUrl)
                    }
                }

                } else {
                    logger.warn("Warning: Invalid STAC object")
                }
            
        } catch(err) {
            logger.warn(`Warning: Did not crawled the following url: ${url} because of the following error: ${err}`)
        }

        if (urlData.urls.length != urlData.titles.length || urlData.urls.length != urlData.parentUrls.length) {
            logger.error(`There are ${urlData.titles.length} titles but ${urlData.urls.length} urls and 
                ${urlData.parentUrls.length} parent urls you want to add to the queue.`)
        }
        if (urlData.urls.length >= 1000 || !await hasNextUrl()) {
            //add the data to the queue
            addToQueue(urlData.titles, urlData.urls, urlData.parentUrls)

            //reset the urlData
            urlData.titles = []
            urlData.urls = []
            urlData.parentUrls = []
        }
        
        // Remove processed URL from queue to avoid re-processing
        await removeFromQueue(url);
    }

    logger.info("Crawling finished");
}

/**
* Continue crawler-loop:
* continues crawling if the crawling process stopped because of a network failiure
* - repeatedly fetches the URLs that are already in the queue
* - adds new URLs into queue
* - removes processed URL
*
* This function implements the core recursive traversal described in the Pflichtenheft.
*
* @async
* @function continueCrawlingProcess
* @returns {Promise<void>} Completes when no URLs remain in the queue
*/
export async function continueCrawlingProcess() {

    logger.info("Crawling Process starts again where it stopped");

    // Continue crawling until no URLs remain in queue
    while (await hasNextUrl()) {

        // Fetch next URL entry from queue table
            const entry = await getNextUrlFromDB();
            const url = entry.url_of_source;
            const parentUrl = entry.parent_url ?? null;

        try {
            // Fetch STAC JSON with retry
            const STACObject = await fetchWithRetry(url)

            logger.info(`Crawling: ${url}`);
            
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
        }
        
        // Remove processed URL from queue to avoid re-processing
        await removeFromQueue(url);
        await sleep(CRAWL_DELAY_MS);
    }

    logger.info("Crawling finished");
}
