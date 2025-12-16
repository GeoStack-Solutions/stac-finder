import Migrate from '@radiantearth/stac-migrate';

/**
 * Normalizes STAC Collection to the newest Version (STAC 1.1).
 
 * * @param {Object} rawData - raw JSON-Object.
 * @param {string} sourceUrl - Source URL (for Logs).
 * @returns {Promise<Object>} Object with migrated Collection and Version.
 */
export async function normalizeCollection(rawData, sourceUrl) {
    try {
       
        //creating copy (Deep Clone), to avoid side effects.
        const collectionCopy = JSON.parse(JSON.stringify(rawData));

        // Parameter true = updateVersionNumber (updates 'stac_version' Field)
        const migratedCollection = Migrate.collection(collectionCopy, true);

        // reading version from the migrated object
        const version = migratedCollection.stac_version;

        console.log(`[INFO] Migration succesful for ${sourceUrl}. Version: ${version}`);

        return {
            collection: migratedCollection,
            stacVersion: version
        };

    } catch (error) {
        console.error(`[ERROR] Error  ${sourceUrl}:`, error.message);
        throw error;
    }
}