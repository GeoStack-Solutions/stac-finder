/**
 * @file source_manager.js
 * @description Manages the crawlable STAC sources URLs and the dynamic crawling queue.
 */

//imports
import { logger } from '../logging/logger.js'
import { query } from '../data_management/db_client.js'
import { validateSource } from '../validation/source_validator.js'
import chalk from "chalk";
chalk.level = 3;

//functions

/**
 * Load all STAC sources from the database.
 * 
 * @function loadSources
 * @returns {Promise<Array<Object>>} List of source objects with normalized fields.
 */
export async function loadSources() {
    try {
        const result = await query(`
            SELECT
                id,
                title,
                url,
                type,
                last_crawled_timestamp
            FROM stac.sources;
        `)

        logger.info(chalk.cyan(`Loaded ${result.rows.length} sources from database.`))
        return result.rows

    } catch (error) {
        logger.error(chalk.red("Error loading sources: " + error.message))
        throw error
    }
}

/**
 * Mark a source as successfully crawled by updating its timestamp.
 * 
 * @function markSourceCrawled
 * @param {number} id - The source ID to update.
 * @returns {Promise<void>}
 */
export async function markSourceCrawled(id) {
    try {
        await query(
            `UPDATE stac.sources
             SET last_crawled_timestamp = NOW()
             WHERE id = $1;`,
            [id]
        )

        logger.info(chalk.gray(`Marked source ${id} as crawled.`))

    } catch (error) {
        logger.warn(chalk.yellow(`Failed to update source ${id}: ` + error.message))
        throw error
    }
    
}

/**
 * Load sources that should be crawled based on the crawl interval.
 * Sources are included if they have never been crawled or were last crawled
 * more than the specified interval ago.
 *
 * @function loadSourcesForCrawling
 * @param {number} intervalDays - The minimum days since last crawl (default: 7)
 * @returns {Promise<Array<Object>>} Sources that need crawling.
 */
export async function loadSourcesForCrawling(intervalDays = 7) {
  const sources = await loadValidSources()
  const now = new Date()
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000

  return sources.filter(src => {
    // If never crawled, include the source
    if (!src.last_crawled_timestamp) {
      return true
    }

    // Check if last crawl was older than the interval
    const lastCrawled = new Date(src.last_crawled_timestamp)
    const timeSinceLastCrawl = now - lastCrawled

    return timeSinceLastCrawl > intervalMs
  })
}

/**
 * Load sources that have never been crawled.
 *
 * @function loadUncrawledSources
 * @returns {Promise<Array<Object>>} Sources whose lastCrawled field is null.
 */
export async function loadUncrawledSources() {
  const sources = await loadValidSources()
  return sources.filter(src => !src.last_crawled_timestamp)
}

/**
 * Load only sources that appear valid (URL + type present).
 * 
 * @function loadValidSources
 * @returns {Promise<Array<Object>>} Filtered sources that are crawlable.
 */
export async function loadValidSources() {
    const sources = await loadSources()

    return sources.filter(validateSource)
}

/**
 * function shows if a url is already in the queue
 * @param {string} url 
 * @returns {boolean} true - if the url is in the database
 * @returns {boolean} false - if the url is not in the database
 */
export async function isInSources(url){

    try{
        //select row
        const data = await query(`
            SELECT 1 FROM stac.sources
            WHERE url = $1`,
            [url])

        //if tehre is any data in sources, return queue
        if (data.rowCount > 0){
            return true
        } else {
            return false
        }

    } catch(err) {
        logger.error(chalk.red(`could not show if data is in sources because of the following error: ${err}`))
    }
}