//imports
import { getSourceIdByUrl, upsertCollection, upsertSource, getLastCrawledTimestamp  } from "../data_management/db_writer.js"
import { validateStacObject } from "../validation/json_validator.js"
import { addToQueue } from "../queueManager/queue_manager.js"
import { logger } from "../logging/logger.js"
import { parseCollection } from "../handleCollections/CollectionParser.js"
import chalk from "chalk"


const MAX_RETRIES = 3;       // Max attempts
const RETRY_DELAY_MS = 2000; // Base backoff time

/**
 * Retry-aware fetch:
 * - 15s timeout per request
 * - aborts fast on fatal 4xx (except 429) and 504 Gateway Timeout
 * - retries: Network errors, 5xx Server Errors, and 429 (Rate Limit) with linear backoff
 * - returns parsed JSON on success
 */
export async function fetchWithRetry(url, maxRetries = MAX_RETRIES) {
    const TIMEOUT_MS = 15000; // 15s Timeout
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            logger.info(chalk.gray(`Fetching ${url} (attempt ${attempt}/${maxRetries})`));
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            const status = response.status;
            if (response.ok) {
                try {
                    return await response.json();
                } catch (parseError) {
                    throw new Error(`Failed to parse JSON: ${parseError.message}`);
                }
            }

            if (status === 504) {
                throw new Error(`Fatal Server Error ${status}: Gateway Time-out - Will not retry.`);
            }

            if (status >= 400 && status < 500 && status !== 429) {
                throw new Error(`Fatal Client Error ${status}: ${response.statusText} - Will not retry.`);
            }
            throw new Error(`Request failed with status ${status}: ${response.statusText}`);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error("Fatal: Timeout of 15s reached - Will not retry to save time.");
            }
            if (error.message.includes("Fatal")) throw error;
            logger.warn(chalk.yellow(`Attempt ${attempt} failed for ${url}: ${error.message}`));
            if (attempt === maxRetries) throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            const delay = RETRY_DELAY_MS * attempt;
            logger.info(chalk.gray(`Waiting ${delay}ms before next retry...`));
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

//helping functions for the crawler engine

/**
 * @function handleSTACObject
 * saves catalog and collection data based on the type of the given stac object
 * @param {JSON} STACObject - given stac object, any type
 * @param {string} Link - link to the stac object
 * @param {string|null} parentUrl - url of the parent catalog/collection as stored in the queue
 * @returns {object} - child data (if the stac object is a collection)
 */
export function makeHandleSTACObject(deps = {}) {
    const {
        validateStacObject: validate = validateStacObject,
        upsertSource: upsertSourceFn = upsertSource,
        getSourceIdByUrl: getSourceIdByUrlFn = getSourceIdByUrl,
        upsertCollection: upsertCollectionFn = upsertCollection,
        addToQueue: addToQueueFn = addToQueue,
        getChildURLs: getChildURLsFn = getChildURLs,
        logger: loggerFn = logger,
        getLastCrawledTimestamp: getLastCrawledTimestampFn = getLastCrawledTimestamp,
    } = deps

    return async function handleSTACObjectImpl(STACObject, Link, parentUrl = null) {

        //only run the following code if the stac object is valid
        if (validate(STACObject).valid) {
            
            //check the type of the stac object
            let STACObjectType = STACObject.type

            // Get last crawl time before upsertSource updates it to NOW()
            const lastCrawled = (STACObjectType === "Collection")
                ? await getLastCrawledTimestampFn(Link)
                : null

            // Track the source id of the currently crawled Catalog/Collection (self)
            let currentSourceId = null

            // Catalogs and Collections should be stored in sources
            if (STACObjectType === "Catalog" || STACObjectType === "Collection") {
                const sourceData = {
                    url: Link,
                    title: STACObject.title,
                    type: STACObject.type
                }
                currentSourceId = await upsertSourceFn(sourceData)
            }

            //depending on the type, run the following code:
            if (STACObjectType === "Catalog") {

                //get the titles and urls of the childs
                let childs = getChildURLsFn(STACObject, Link)

                return childs

            } else if (STACObjectType === "Collection") {
                
                //get the title and the urls of the childs
                let childs = getChildURLsFn(STACObject, Link)

                // Resolve parent source_id from sources table via parentUrl
                let parentSourceId = null
                if (parentUrl) {
                    parentSourceId = await getSourceIdByUrlFn(parentUrl)
                    if (!parentSourceId) {
                        loggerFn.warn(`Could not resolve parent source id for collection ${Link} (parentUrl=${parentUrl})`)
                    }
                } else {
                    // Root-collection (start URL) should link to itself as source
                    parentSourceId = currentSourceId
                }

                  // Parse collection to extract metadata and inject source ID
                const parsedCollection = parseCollection(STACObject, parentSourceId, new Date());

                if (parsedCollection) {
                     // Check if STAC object is newer than last crawl (Incremental Update)
                    const sourceUpdated = STACObject.properties?.updated || STACObject.updated;
                    let shouldUpdate = true;

                    if (lastCrawled && sourceUpdated) {
                        // Compare dates: if source is older or equal to last crawl, skip
                        if (new Date(sourceUpdated) <= new Date(lastCrawled)) {
                            shouldUpdate = false;
                            loggerFn.info(`Skipping update: ${Link} not modified.`);
                        }
                    }

                    // Only upsert if content has changed or we force it (first crawl)
                    if (shouldUpdate) {
                        await upsertCollectionFn(parsedCollection);
                    }
                }

                return childs

            } else {
                //Return empty array if the STAC Object is not a catalog or a collection
                return []
            }
        } else {
            loggerFn.warn("Warning: Invalid STAC object")
        }
    }
}

const _defaultHandleSTACObject = makeHandleSTACObject()

export async function handleSTACObject(STACObject, Link, parentUrl = null) {
    return _defaultHandleSTACObject(STACObject, Link, parentUrl)
}

/**
 * @function getChildURLs 
 * gets the URLs and Titles of child objects of a given stac object
 * @param {JSON} STACObject a json object with stac structure
 * @param {string} Link the link to the stac Object
 * @returns childURLs - a list of objects containing title and url of the childs
 */
export function getChildURLs(STACObject, Link) {

    //initialize the URL list
    let childURLs = []


    //iterate through all links in STAC object
    for (let link of STACObject.links) {

        //process links that are marked as "child" and have a valid href
        if (link.rel === "child" && link.href) {

            let childURL = []
            
            //build full child URL from parent URL
            try {
                childURL = new URL(link.href, Link).href
            } catch {
                //skips invalid URLs without breaking crawl
                continue
            }
            
            //dont push urls to the queue that have types like application/geo+json
            if (link.type === "application/json" || link.type === undefined) {
                //push the url and the title to the childURLs list
                childURLs.push({
                    title: link.title || "no title", 
                    url: childURL
                    }
                )
            }
        }
    }

    return(childURLs)
}

/**
 * @param {url} - url of the api
 * @param {title} - title of the api
 */
export async function crawlStacApi(url, title) {
    logger.info(chalk.gray(`Starting API Crawl for: ${url}`));

    try {
        // Prepare URL: Append "/collections" to the base URL
        // Remove trailing slash if present, then add /collections
        let collectionsUrl = url.replace(/\/$/, "") + "/collections";
        
        //Fetch the Collections list with Retry
        const data = await fetchWithRetry(collectionsUrl);

        // APIs usually return { "collections": [...] }
        const collections = data.collections || [];

        logger.info(chalk.gray(`Found ${collections.length} collections in API ${url}`));

        // Ensure API source exists in database and get its ID
        const sourceId = await upsertSource({
            url: url,
            title: title || 'STAC API',
            type: 'API'
        });

        //Iterate and Save
        for (const collection of collections) {
            
            // Try to find "self" link, otherwise construct URL
            const selfLink = collection.links?.find(link => link.rel === 'self');
            
            // Parse API collection to extract metadata and prepare for DB upsert
            const parsedCollection = parseCollection(collection, sourceId, new Date());
            if (parsedCollection) {
                await upsertCollection(parsedCollection);
        }
        }

        logger.info(chalk.gray(`Finished API Crawl for ${url}`));

    } catch (error) {
        logger.error(chalk.red(`API Crawl failed for ${url}: ${error.message}`));
    }
}