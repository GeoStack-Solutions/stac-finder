/**
 * @file source_manager.js
 * @description Manages the crawlable STAC sources URLs and the dynamic crawling queue.
 */

//imports
import { logger } from "../logging/logger.js"
import { query } from "../data_management/db_client.js"
import { loadUncrawledSources } from "../sourceManager/source_manager.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import chalk from "chalk";
chalk.level = 3;

// Resolve backup file path relative to this module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backupFilePath = path.resolve(__dirname, "./backupCopy.json")

//functions

//Store the data to upload it later to the queue
//Store it outside of the startCrawler Function to save it in a file if the crawling process stops
export const urlData = {
    titles : [],
    urls : [],
    parentUrls : []
}

/**
 * @function resetUrlData
 * resets the URLData Object
 */
export function resetUrlData() {
    urlData.titles = []
    urlData.urls = []
    urlData.parentUrls = [] 
}

/**
 * @function saveInBackup
 * saves the data that is in the URLData Object in a Backup File
 */
export function saveInBackup() {

    //only create a Backup file if there is data in the URLData Object
    if (urlData.urls.length > 0) {
        fs.mkdirSync(path.dirname(backupFilePath), { recursive: true })
        fs.writeFileSync(backupFilePath, JSON.stringify(urlData))
        
        logger.info(chalk.cyan("The crawling process has been stopped. The data that had not yet been uploaded to the database has been saved in a backup file."))
    
    } else {
        logger.info(chalk.cyan("The crawling process has been stopped. There is no temporary data to store in a backup file."))
    }
}

/**
 * Adds a URL to the queue if not already present.
 * @param {string} titles array of titles
 * @param {string} urls array of urls
 * @param {string|null} parentUrls arrays of urls of the parent stac objects
 * @function addToQueue
 */
export async function addToQueue(titles, urls, parentUrls = null) {

    try {
        //insert the data to the queue
        const res = await query(`
            INSERT INTO stac."urlQueue" (title_of_source, url_of_source, parent_url)
            SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[])
            ON CONFLICT (url_of_source) DO NOTHING`,
            [titles, urls, parentUrls]
        )

        logger.info(chalk.cyan(`Added ${res.rowCount} URL's to the queue`))

    } catch(err) {
        //log error
        logger.error(chalk.red(`Did not add the data to the queue because of the following error: ${err}`))
    }
}

/**
 * Removes a url from the queue
 * @param {string} url 
 */
export async function removeFromQueue(url){

    //check if the url is in the queue
    if (!(await isInQueue(url))){
        logger.warn(chalk.yellow(`Did not remove the following url: ${url}, it is not in the queue`))
        return
    }
    
    try {
        //delete row
        await query(`
            DELETE FROM stac."urlQueue"
            WHERE url_of_source = $1`,
            [url])

        //log deleted Data
        logger.info(chalk.gray(`Deleted from queue: ${url}`))
    } catch(err) {
        //log error
        logger.error(chalk.red(`Did not deleted the data from the queue because of the following error: ${err}`))
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
        logger.error(chalk.red(`could not show if data is in queue because of the following error: ${err}`))
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

    logger.info(chalk.cyan(`Initialized queue with ${sources.length} source URLs`));
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
        ORDER BY RANDOM()
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
