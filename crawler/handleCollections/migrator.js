import Migrate from '@radiantearth/stac-migrate';

/**
 * Normalizes STAC Objects (Collections or Catalogs) to the newest STAC Version.
 * * @param {Object} rawData - The raw JSON object (Catalog or Collection).
 * @param {string} sourceUrl - Source URL (used for logging purposes).
 * @returns {Promise<Object>} Object containing the migrated data and the new version.
 */
export async function normalizeCollection(rawData, sourceUrl) {
    try {
       
        // create a deep clone to avoid side effects
        const objectCopy = JSON.parse(JSON.stringify(rawData));

        let migratedObject;

        // check the type to apply the correct migration strategy
        if (objectCopy.type === 'Catalog') {

            migratedObject = Migrate.catalog(objectCopy, true); 
        } else {
            migratedObject = Migrate.collection(objectCopy, true);
        }

        // read the version from the migrated object
        const version = migratedObject.stac_version;


        return {
            collection: migratedObject, // keep the key 'collection' for consistency, even if it is a catalog
            stacVersion: version
        };

    } catch (error) {
        console.warn(`[WARN] Migration failed for ${sourceUrl}: ${error.message}`);
        // rethrow the error so the caller knows migration failed and can decide to use the raw object instead
        throw error;
    }
}