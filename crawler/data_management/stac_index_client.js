//imports
import { query } from "../crawling/src/data/db_client.js"
import { logger } from "../crawling/src/config/logger.js"

/**
 * @function getSTACIndexData
 * @returns { data } - List of data from the stac index Database
 * [{url: ... , title: ...}, {...}, ...]
 */
export async function getSTACIndexData() {
    
    try {
        //get the url data from the stac index database
        const result = await query(`
            SELECT 
                url,
                title
            FROM stac.catalogs
        `)

        //initialize URLs to save the urls
        const data = []
        
        //push the URLs to the array
        for (let row of result.rows) {
            data.push(row)
        }

        logger.info(`Loaded ${result.rows.length} URLs from the stac index database.`)

        return data

    } catch (error) {
        logger.error("Error loading URLs from the stac index database: " + error.message)
        throw error
    }
}