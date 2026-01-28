import { pool } from '../crawling/src/data/db_client.js'; 

// Convert any value to PostgreSQL TEXT[] array, handling nulls and type conversion
const toTextArray = (v) =>
  Array.isArray(v) ? v.map((x) => (x == null ? null : String(x))) : [];

// Parse JSON: handles already-parsed objects and avoids double-stringification
const safeJSON = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return fallback; }
  }
  return v;
};

/**
 * Insert or update a STAC source (API/Catalog endpoint) in the database
 * Ensures unique URL and refreshes metadata on subsequent crawls
 * @param {{url: string, title?: string, type?: string}} source - Source metadata
 * @returns {Promise<number>} Internal source ID for FK references
 */
export async function upsertSource(source) {
  const query = `
    INSERT INTO stac.sources (url, title, type, last_crawled_timestamp)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (url)
    DO UPDATE SET
      last_crawled_timestamp = NOW(),
      title = EXCLUDED.title,
      type = EXCLUDED.type
    RETURNING id;
  `;
  const values = [source.url, source.title, source.type];
  const res = await pool.query(query, values);
  return res.rows[0].id;
}

/**
 * Resolve a source id by its URL.
 * @param {string} url
 * @returns {Promise<number|null>} id if found, otherwise null
 */
export async function getSourceIdByUrl(url) {
  const res = await pool.query(
    `SELECT id FROM stac.sources WHERE url = $1 LIMIT 1;`,
    [url]
  );
  return res.rows[0]?.id ?? null;
}

/**
 * Get the last crawled timestamp for a specific URL before it is overwritten.
 * @param {string} url
 * @returns {Promise<Date|null>}
 */
export async function getLastCrawledTimestamp(url) {
  const res = await pool.query(
    `SELECT last_crawled_timestamp FROM stac.sources WHERE url = $1 LIMIT 1;`,
    [url]
  );
  return res.rows[0]?.last_crawled_timestamp ?? null;
}

/**
 * Insert or update a STAC collection with metadata normalization
 * Handles array/JSON conversions, spatial geometry, and temporal bounds 
 * Implements Duplicate Handling via Upsert Strategy
 * @param {Object} data - Parsed collection metadata 
 */
export async function upsertCollection(data) {
  // Validate and normalize bounding box: ensure 4 valid numbers
  let bbox = [-180, -90, 180, 90];
  if (Array.isArray(data.bbox) && data.bbox.length >= 4) {
    const c = data.bbox.map(Number);
    if (!c.some(isNaN)) bbox = c.slice(0, 4);
  }

  // Prepare TEXT[] columns: convert arrays to PostgreSQL text arrays
  const keywords = toTextArray(data.keywords);
  const platform = toTextArray(data.platform);
  const constellation = toTextArray(data.constellation);
  const processing_level = toTextArray(data.processing_level);

  // Prepare JSONB columns: parse JSON strings and validate structure
  const providers = safeJSON(data.providers, []);
  const gsd = safeJSON(data.gsd, null);
  const raw_json = safeJSON(data.raw_json, {});

  const query = `
    INSERT INTO stac.collections (
      id, source_id, title, description, keywords, license,
      providers, doi, platform_summary, constellation_summary,
      gsd_summary, processing_level_summary,
      spatial_extent, temporal_start, temporal_end,
      last_crawled_timestamp, raw_json
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7::jsonb,
      $8, $9, $10,
      $11::jsonb,
      $12,
      ST_MakeEnvelope($13, $14, $15, $16, 4326),
      $17, $18,
      NOW(),
      $19::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      keywords = EXCLUDED.keywords,
      license = EXCLUDED.license,
      providers = EXCLUDED.providers,
      doi = EXCLUDED.doi,
      platform_summary = EXCLUDED.platform_summary,
      constellation_summary = EXCLUDED.constellation_summary,
      gsd_summary = EXCLUDED.gsd_summary,
      processing_level_summary = EXCLUDED.processing_level_summary,
      spatial_extent = EXCLUDED.spatial_extent,
      temporal_start = EXCLUDED.temporal_start,
      temporal_end = EXCLUDED.temporal_end,
      last_crawled_timestamp = NOW(),
      raw_json = EXCLUDED.raw_json;
  `;

  const values = [
    data.id,
    data.source_id,
    data.title ?? null,
    data.description ?? null,
    keywords,
    data.license ?? null,
    JSON.stringify(providers),
    data.doi ?? null,
    platform,
    constellation,
    JSON.stringify(gsd),
    processing_level,
    bbox[0], bbox[1], bbox[2], bbox[3],
    data.temporal_start ?? null,
    data.temporal_end ?? null,
    JSON.stringify(raw_json),
  ];

  await pool.query(query, values);
  console.log(`DB: Collection '${data.id}' upserted successfully`);
  return true;
}
