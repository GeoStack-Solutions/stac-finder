/**
 * @file source_manager.js
 * @description Manages the crawlable STAC sources URLs and the dynamic crawling queue.
 */

//imports
import { logger } from "./src/config/logger.js"
import { query } from "./src/data/db_client.js"
import { loadUncrawledSources } from "./source_manager.js"

//functions

/**
 * Adds a URL to the queue if not already present.
 * @param {string} titles array of titles
 * @param {string} urls array of urls
 * @param {string|null} parentUrls arrays of urls of the parent stac objects
 * @function addToQueue
 */
export async function addToQueue(titles, urls, parentUrls = null) {

    try {
        //upload title and url
        // await query(`
        //     INSERT INTO stac."urlQueue" (title_of_source, url_of_source, parent_url)
        //     VALUES ($1, $2, $3)`,
        //     [title, url, parentUrl]
        // )

        const res = await query(`
            INSERT INTO stac."urlQueue" (title_of_source, url_of_source, parent_url)
            SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[])
            ON CONFLICT (url_of_source) DO NOTHING`,
            [titles, urls, parentUrls]
        )

        logger.info(`Added ${res.rowCount} URL's to the queue`)

    } catch(err) {
        //log error
        logger.warn(`Did not add the data to the queue because of the following error: ${err}`)
    }
}

/**
 * Removes a url from the queue
 * @param {string} url 
 */
export async function removeFromQueue(url){

    //check if the url is in the queue
    if (!(await isInQueue(url))){
        logger.info(`Did not remove the following url: ${url}, it is not in the queue`)
        return
    }
    
    try {
        //delete row
        await query(`
            DELETE FROM stac."urlQueue"
            WHERE url_of_source = $1`,
            [url])

        //log deleted Data
        logger.info(`Deleted from queue: ${url}`)
    } catch(err) {
        //log error
        logger.warn(`Did not deleted the data from the queue because of the following error: ${err}`)
    }
}

/**
 * Clears the current queue (e.g. at start of crawler run).
 * @function clearQueue
 */
export async function clearQueue() {
    
    try {
        //delete data
        await query(`
            DELETE FROM stac."urlQueue"`)

        //log deleted Data
        logger.info(`cleared queue`)
    } catch(err) {
        //log error
        logger.warn(`Did not cleared the queue because of the following error: ${err}`)
    }
}

/**
 * function shows if a url is already in the queue
 * @param {string} url 
 * @returns {boolean} true - if the url is in the database
 * @returns {boolean} false - if the url is not in the database
 */
export async function isInQueue(url){

    try{
        //select row
        const data = await query(`
            SELECT 1 FROM stac."urlQueue"
            WHERE url_of_source = $1`,
            [url])

        //if there is any data in queue, return true
        if (data.rowCount > 0){
            return true
        } else {
            return false
        }

    } catch(err) {
        logger.warn(`could not show if data is in queue because of the following error: ${err}`)
    }
}

/**
 * Initializes the crawling queue by inserting all uncrawled
 * STAC sources from the database into the urlQueue table.
 *
 * This provides the crawler with its initial work list.
 *
 * @async
 * @function initializeQueue
 * @returns {Promise<void>}
 */
export async function initializeQueue() {
    const sources = await loadUncrawledSources(); // from source_manager

    for (const src of sources) {
        await addToQueue(src.title, src.url, null);
    }

    logger.info(`Initialized queue with ${sources.length} source URLs`);
}

/**
 * Returns next URL in FIFO order and metadata row
 *
 * @async
 * @function getNextUrlFromDB
 * @returns {Promis<Object|null>} The next queue entry (id, title_of_source, url_of_source)
 *                                or null if queue is empty.
 */
export async function getNextUrlFromDB() {
    const result = await query(`
        Select * FROM stac."urlQueue"
        ORDER BY id ASC
        LIMIT 1;
        `);

        return result.rows[0] || null;
}

/**
* Checks whether the queue currently contians URLs to process.
* 
* Used by the crawler engine to determine when to terminate.
*
* @async
* @function hasNextUrl
* @returns {Promise<boolean>} Ture if at least one entry exists, otherwise false.
*/
export async function hasNextUrl() {
    const result = await query(`
        SELECT COUNT(*) AS count
        FROM stac."urlQueue";
        `);

        return Number(result.rows[0].count) > 0;
}
