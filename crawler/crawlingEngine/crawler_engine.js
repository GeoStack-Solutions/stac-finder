//imports 
import {
    getNextUrlFromDB,
    hasNextUrl,
    removeFromQueue,
    addToQueue,
    resetUrlData,
    urlData
} from "../queueManager/queue_manager.js";

import { loadUncrawledSources, loadSourcesForCrawling } from "../sourceManager/source_manager.js";
import { handleSTACObject, crawlStacApi, fetchWithRetry } from "./crawler_functions.js"
import { validateQueueEntry } from "../validation/queue_validator.js";
import { validateStacObject } from "../validation/json_validator.js";
import { logger } from "../logging/logger.js"
import { getSTACIndexData } from "../data_management/stac_index_client.js";
import { isInSources } from "../sourceManager/source_manager.js";
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { normalizeStacObject } from "./migrator.js";
import chalk from "chalk";
chalk.level = 3;

// Resolve backup file path relative to this module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backupFilePath = path.resolve(__dirname, "../queueManager/backupCopy.json")

const CRAWL_DELAY_MS = 100; // Polite delay

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    logger.info(chalk.cyan("Crawler started"));

    //if there is any backup data
    if (fs.existsSync(backupFilePath)) {
        //get the backupData
        let queueBackupCopy = JSON.parse(fs.readFileSync(backupFilePath))

        logger.info(chalk.cyan(`Found ${queueBackupCopy.urls.length} URL's in the backup file.`))

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

                logger.warn(chalk.yellow("Removed one invalid URL"))
            }
        }

        addToQueue(queueBackupCopy.titles, queueBackupCopy.urls, queueBackupCopy.parentUrls)
        
        //Remove the backup file
        fs.unlinkSync(backupFilePath)

        logger.info(chalk.cyan("Removed the backup file"))
    }

    //reset the url Data
    resetUrlData()

    // we now load sources manually to check their type.
    // Only load sources that have never been crawled or were last crawled more than 7 days ago
    const sources = await loadSourcesForCrawling(7);
    
    logger.info(chalk.cyan(`Found ${sources.length} sources to process.`));

    for (const source of sources) {
        //validate data
        if (validateQueueEntry(source.title, source.url)) {

            //add the data to the array
            urlData.titles.push(source.title)
            urlData.urls.push(source.url)
            urlData.parentUrls.push(null)
            }
        }

    //make sure that the length of the arrays is equal
    //otherwise the data could get mixed up
    if (urlData.titles.length == urlData.urls.length) {

        //push uncrawled sources to the queue
        await addToQueue(urlData.titles, urlData.urls, urlData.parentUrls);

    } else {
        logger.error(chalk.red(`There are ${urlData.titles.length} titles but ${urlData.urls.length} urls you want to add to the queue.`))
        throw err
    }

    resetUrlData()

    // Load URLs from STAC Index (fail-safe)
    try {

        //get the data from the STAC Index Database
        const STACIndexData = await getSTACIndexData();

        //bring the data in the format needed to add it to the queue
        for (let data of STACIndexData) {

            let isAPI = data.is_api

            if (isAPI) {
                await crawlStacApi(data.url, data.title)
            }

            //validate data
            if (!isAPI) {
                
                if (validateQueueEntry(data.title, data.url)) {
                    //add the data to the array
                    urlData.titles.push(data.title)
                    urlData.urls.push(data.url)
                    urlData.parentUrls.push(null)
                }
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
        if (urlData.titles.length == urlData.urls.length) {

            //add the data to the queue
            await addToQueue(urlData.titles, urlData.urls, urlData.parentUrls)

            logger.info(chalk.cyan("Added URL's from the STAC Index Database to the queue"))

        } else {
            logger.error(chalk.red(`There are ${urlData.titles.length} titles but ${urlData.urls.length} urls you want to add to the queue.`))
            throw err
        }

        resetUrlData()

    } catch (err) {
        logger.error(chalk.red(`Could not load STAC Index data because of the following error: ${err}.`));
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


            logger.info(chalk.gray(`Crawling: ${url}`));

            //validate the stac Object
            let valid = validateStacObject(STACObject).valid
            
            // Only proceed if valid JSON was retrieved
            if (valid) {

                //for Catalogs: get the child data and save the catalog data in the sources db
                //for Collections: get the child data, save the collection data in the collections and the sources db
                const childData = await handleSTACObject(STACObject, url, parentUrl)

                for(let child of childData) {

                    //validate child data
                    if(validateQueueEntry(child.title, child.url, url)) {

                        //add the child data to the urlData
                        urlData.titles.push(child.title)
                        urlData.urls.push(child.url)
                        urlData.parentUrls.push(url)
                    }
                }

            } else {
                    logger.warn(chalk.yellow("Invalid STAC object"))
            }
            
        } catch(err) {
            logger.error(chalk.red(`Did not crawled the following url: ${url} because of the following error: ${err}`))
        }

        if (urlData.urls.length != urlData.titles.length || urlData.urls.length != urlData.parentUrls.length) {
            logger.error(chalk.red(`There are ${urlData.titles.length} titles but ${urlData.urls.length} urls and 
                ${urlData.parentUrls.length} parent urls you want to add to the queue.`))
        }

        if (urlData.urls.length >= 1000 || !await hasNextUrl()) {

            //add the data to the queue
            await addToQueue(urlData.titles, urlData.urls, urlData.parentUrls)

            //reset the urlData
            resetUrlData()
        }
        
        // Remove processed URL from queue to avoid re-processing
        await removeFromQueue(url);
    }

    logger.info(chalk.cyan("Crawling finished"));
}
