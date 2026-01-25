//imports 
import pLimit from 'p-limit';

import {
    initializeQueue,
    getNextUrlFromDB,
    hasNextUrl,
    removeFromQueue,
    addToQueue,
    resetUrlData,
    urlData
} from "./queue_manager.js";

import { loadUncrawledSources } from "./source_manager.js";
import { crawlStacApi, validateQueueEntry, processUrl } from "./crawler_functions.js"
import { logger } from "./src/config/logger.js"
import { getSTACIndexData } from "../data_management/stac_index_client.js";
import { isInSources } from "./source_manager.js";
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Resolve backup file path relative to this module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backupFilePath = path.resolve(__dirname, "./src/data/backupCopy.json")

// Configuration for parallel crawling
const CONCURRENCY_LIMIT = 5; 
const limit = pLimit(CONCURRENCY_LIMIT);

const CRAWL_DELAY_MS = 100; // Polite delay

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


/**
 * Parallel Loop Manager:
 * - Fetches batches of URLs from the DB
 * - Assigns them to p-limit workers
 * - Waits for batch completion
 */
async function runParallelLoop() {
    // Continue crawling until no URLs remain in queue
    while (await hasNextUrl()) {
        const batch = [];

        // Fill the batch until limit is reached or queue is empty
        while (batch.length < CONCURRENCY_LIMIT && await hasNextUrl()) {
            
            // fetch and DELETE entry atomically
            const entry = await getNextUrlFromDB();
            
            if (entry) {
                // Wrap the processUrl task with p-limit
                const task = limit(() => processUrl(entry));
                batch.push(task);
            }
        }

        if (batch.length === 0) break;

        // Wait for all tasks in this batch to complete (or fail)
        await Promise.all(batch);
        
        
        await sleep(CRAWL_DELAY_MS);
    }
}

/**
* Main crawler loop:
* - Loads uncrawled sources from DB
* - Strategy A (API): Crawls directly via /collections
* - Strategy B (Static): Adds to queue for recursive processing
* - Starts Parallel Processing
* @async
* @function startCrawler
* @returns {Promise<void>} Completes when all APIs are done and the static queue is empty
*/
export async function startCrawler() {

    logger.info("Crawler started");

    //if there is any backup data
    if (fs.existsSync(backupFilePath)) {
        //get the backupData
        let queueBackupCopy = JSON.parse(fs.readFileSync(backupFilePath))

        logger.info(`Found ${queueBackupCopy.urls.length} URL's in the backup file.`)

        //Remove the backup file
        fs.unlinkSync(backupFilePath)

        logger.info("Removed the backup file")

        //validate the backup data
        for (let i = queueBackupCopy.urls.length - 1; i >= 0; i--) {
            const title = queueBackupCopy.titles[i]
            const url = queueBackupCopy.urls[i]
            const parentUrl = queueBackupCopy.parentUrls[i] ?? null

            //if there is invalid data, remove it from the queue backup copy 
            if (!validateQueueEntry(title, url, parentUrl)) {
                queueBackupCopy.titles.splice(i, 1)
                queueBackupCopy.urls.splice(i, 1)
                queueBackupCopy.parentUrls.splice(i, 1)

                logger.info("removed one invalid URL")
            }
        }

        addToQueue(queueBackupCopy.titles, queueBackupCopy.urls, queueBackupCopy.parentUrls)
    }

    //reset the url Data
    resetUrlData()

    // we now load sources manually to check their type.
    const sources = await loadUncrawledSources(); //
    
    logger.info(`Found ${sources.length} sources to process.`);

    for (const source of sources) {
        if (source.type === 'API') {
            // Process directly, no queue needed for the collections list
            await crawlStacApi(source); //
        } else {
            //validate data
            if (validateQueueEntry(source.title, source.url)) {

                //add the data to the array
                urlData.titles.push(source.title)
                urlData.urls.push(source.url)
                urlData.parentUrls.push(null)
            }
        }
    }

    //make sure that the length of the arrays is equal
    //otherwise the data could get mixed up
    if (urlData.titles.length == urlData.urls.length && urlData.urls.length > 0) {
        await addToQueue(urlData.titles, urlData.urls, urlData.parentUrls); 
    }
    resetUrlData()

    // Load URLs from STAC Index (fail-safe)
    try {

        //get the data from the STAC Index Database
        const STACIndexData = await getSTACIndexData();

        //bring the data in the format needed to add it to the queue
        for (let data of STACIndexData) {

            //validate data
            if (validateQueueEntry(data.title, data.url)) {

                //add the data to the array
                urlData.titles.push(data.title)
                urlData.urls.push(data.url)
                urlData.parentUrls.push(null)
            }
        }
        
        //if the data is already in sources, remove it
        for (let i = urlData.urls.length - 1; i >= 0; i--) {
            const url = urlData.urls[i]

            //if there is invalid data, remove it from the queue backup copy 
            if (await isInSources(url)) {
                urlData.titles.splice(i, 1)
                urlData.urls.splice(i, 1)
                urlData.parentUrls.splice(i, 1)
            }
        }

        //make sure that the length of the arrays is equal
        //otherwise the data could get mixed up
        if (urlData.titles.length == urlData.urls.length && urlData.urls.length > 0) {
            await addToQueue(urlData.titles, urlData.urls, urlData.parentUrls)
            logger.info("Added URL's from the STAC Index Database to the queue")
        }
        resetUrlData()

    } catch (err) {
        logger.error("Could not load STAC Index data, starting with existing queue only.");
    }

   await runParallelLoop();

    logger.info("Crawling finished");
}

/**
* Continue crawler-loop:
* - continues crawling if the crawling process stopped
* - Uses parallel processing via runParallelLoop
*
* This function implements the core recursive traversal described in the Pflichtenheft.
*
* @async
* @function continueCrawlingProcess
* @returns {Promise<void>} Completes when no URLs remain in the queue
*/
export async function continueCrawlingProcess() {

    logger.info("Crawling Process starts again where it stopped");

    // Start parallel process
    await runParallelLoop();

    logger.info("Crawling finished");
}