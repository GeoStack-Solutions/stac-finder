import { logger } from "../logging/logger.js"
import chalk from "chalk";
chalk.level = 3;

/**
 * @function validateQueueEntry
 * validates a queue entry to make sure that only valid objects will be crawled
 * @param {string} title - title of a stac object
 * @param {string} url - url of a stac object
 * @param {string} parentUrl - parent url of a stac object
 * @returns true if everything is ok
 *          false if there is any Problem with the source
 */
export async function validateQueueEntry(title, url, parentUrl = null) {
    
    // validate URL format
    try {
        new URL(url)
    } catch {
        logger.warn(chalk.yellow(`Did not added the following invalid URL to the queue: ${url}`))
        //return false
        return false
    }

    // validate title
    if (typeof title !== "string") {
        logger.warn(chalk.yellow(`Did not added the following invalid entry with the title: ${title}`))
        //return false
        return false
    }

    // validate parentUrl 
    if (parentUrl != null) {
        try {
            new URL(parentUrl)
        } catch {
            logger.warn(chalk.yellow(`Did not add the url with the following invalid parent URL to the queue: ${parentUrl}`))
            //return false
            return false
        }
    }

    return true
}