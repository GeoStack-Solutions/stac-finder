/**
 * @file source_manager.js
 * @description Manages the crawlable STAC sources URLs and the dynamic crawling queue.
 */

//imports
import { logger } from './src/config/logger.js'
import { query } from './src/data/db_client.js'

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

        logger.info(`Loaded ${result.rows.length} sources from database.`)
        return result.rows

    } catch (error) {
        logger.error("Error loading sources: " + error.message)
        throw error
    }
}

/**
 * Retrieve a single source record by ID.
 * 
 * @function getSource
 * @param {number} id - The ID of the source to load.
 * @returns {Promised<Object|null>} The source record or null if not found.
 */
export async function getSource(id) {
    try {
        const result = await query(
            `SELECT * FROM stac.sources WHERE id = $1 LIMIT 1;`,
            [id]
        )

        return result.rows[0] || null
    } catch (error) {
        logger.error(`Error loading source ${id}: ${error.message}`)
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

        logger.info(`Marked source ${id} as crawled.`)

    } catch (error) {
        logger.error(`Failed to update source ${id}: ` + error.message)
        throw error
    }
    
}

/**
 * Load only sources that appear valid (URL + type present).
 * 
 * @function loadActiveSources
 * @returns {Promise<Array<Object>>} Filtered sources that are crawlable.
 */
export async function loadActiveSources() {
    const sources = await loadSources()

    return sources.filter(validateSource)
}

/**
 * Load sources that have never been crawled.
 *
 * @function loadUncrawledSources
 * @returns {Promise<Array<Object>>} Sources whose lastCrawled field is null.
 */
export async function loadUncrawledSources() {
  const sources = await loadSources()
  return sources.filter(src => !src.last_crawled_timestamp)
}

/**
 * Validate whether a source record contains a valid URL + type.
 *
 * @function validateSource
 * @param {Object} source - Source object.
 * @param {string} source.url - The URL to validate.
 * @param {string} source.type - The crawler-type of the source.
 * @returns {boolean} True if valid, otherwise false.
 */
export function validateSource(source) {
    if (!source.url) return false
    if (!source.type) return false

    try {
        new URL(source.url) // throws on invalid URLs
    } catch {
        return false
    }

    return true
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
        logger.warn(`could not show if data is in sources because of the following error: ${err}`)
    }
}