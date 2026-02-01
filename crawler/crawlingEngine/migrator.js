import Migrate from '@radiantearth/stac-migrate';
import { logger } from '../logging/logger.js';
import chalk from "chalk";
chalk.level = 3;

/**
 * Normalizes STAC Objects (Collection or Catalog) to the newest STAC Version.
 * @param {Object} rawData - The raw JSON object.
 * @param {string} sourceUrl - Source URL (for logging purposes).
 * @returns {Promise<Object>} Object containing the migrated data and the new version.
 */
export async function normalizeStacObject(rawData, sourceUrl) {
    try {
       
        // create a deep clone to prevent side effects
        const objectCopy = JSON.parse(JSON.stringify(rawData));

        let migratedObject;

        // check type to apply the correct migration strategy
        if (objectCopy.type === 'Catalog') {
            // migrate as a Catalog
            migratedObject = Migrate.catalog(objectCopy, true); 

        } else {
            // migrate as a Collection 
            migratedObject = Migrate.collection(objectCopy, true);
        }

        // extracts the new STAC version from the migrated object
        const version = migratedObject.stac_version;


        return {
            collection: migratedObject, // keep the key 'collection' for consistency, even if it is a catalog
            stacVersion: version
        };

    } catch (error) {
        logger.error(chalk.red(`${sourceUrl}:`, error.message));
        console.warn(`[WARN] Migration failed for ${sourceUrl}: ${error.message}`);
        // Re-throw the error so the caller knows the migration failed
        throw error;
    }
}
