module.exports = {
  id: { column: 'c.id', type: 'text' },
  title: { column: 'c.title', type: 'text' },
  description: { column: 'c.description', type: 'text' },
  license: { column: 'c.license', type: 'text' },
  doi: { column: 'c.doi', type: 'text' },

  // Temporal
  temporal_start: { column: 'c.temporal_start', type: 'timestamptz' },
  temporal_end: { column: 'c.temporal_end', type: 'timestamptz' },

  // Spatial
  spatial_extent: { column: 'c.spatial_extent', type: 'geometry' },

  // arrays (text[])
  keywords: { column: 'c.keywords', type: 'text_array' },

  platform: { column: 'c.platform_summary', type: 'text_array' },
  platform_summary: { column: 'c.platform_summary', type: 'text_array' },

  constellation: { column: 'c.constellation_summary', type: 'text_array' },
  constellation_summary: { column: 'c.constellation_summary', type: 'text_array' },

  processingLevel: { column: 'c.processing_level_summary', type: 'text_array' },
  processing_level_summary: { column: 'c.processing_level_summary', type: 'text_array' },

  // numeric JSONB array
  gsd: { column: 'c.gsd_summary', type: 'number_jsonb_array' },
  gsd_summary: { column: 'c.gsd_summary', type: 'number_jsonb_array' },

  // providers[*].name in JSONB
  provider: { column: 'c.providers', type: 'jsonb_array', jsonb_field: 'name' },

  // optional virtual field
  temporal_extent: { type: 'temporal_extent' },
};
