// api/utils/queryableMap.js
module.exports = {
    id: { column: 'id', type: 'text' },
    title: { column: 'title', type: 'text' },
    description: { column: 'description', type: 'text' },
    license: { column: 'license', type: 'text' },
    doi: { column: 'doi', type: 'text' },
  
    // Arrays
    keywords: { column: 'keywords', type: 'text_array' },
    platform_summary: { column: 'platform_summary', type: 'text_array' },
    constellation_summary: { column: 'constellation_summary', type: 'text_array' },
    processing_level_summary: { column: 'processing_level_summary', type: 'text_array' },
  
    // Timestamps
    temporal_start: { column: 'temporal_start', type: 'timestamptz' },
    temporal_end: { column: 'temporal_end', type: 'timestamptz' },
  
    // (erstmal NICHT in Basis-Operatoren behandeln)
    // spatial_extent: { column: 'spatial_extent', type: 'geometry' },
    // gsd_summary: { column: 'gsd_summary', type: 'jsonb' },
    // providers: { column: 'providers', type: 'jsonb' },
  };
  