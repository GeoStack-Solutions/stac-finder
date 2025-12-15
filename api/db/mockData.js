// TEMPORARY: Delete this entire file when database is ready
// This file provides mock data for development

const mockCollections = [
  {
    id: 1,
    title: 'Sentinel-2 Level-2A',
    description: 'Sentinel-2 Level-2A Bottom-of-Atmosphere reflectance data',
    spatial_extent: {
      type: 'Polygon',
      coordinates: [[[5.8663153, 47.2701114], [15.0419319, 47.2701114], [15.0419319, 55.099161], [5.8663153, 55.099161], [5.8663153, 47.2701114]]]
    },
    xmin: 5.8663153,
    ymin: 47.2701114,
    xmax: 15.0419319,
    ymax: 55.099161,
    temporal_start: '2015-06-23T00:00:00Z',
    temporal_end: '2024-12-31T23:59:59Z',
    license: 'CC-BY-4.0',
    keywords: ['sentinel', 'satellite', 'optical'],
    providers: ['ESA', 'Copernicus'],
    doi: '10.5067/SENTINEL2/MSI',
    platform_summary: ['Sentinel-2A', 'Sentinel-2B'],
    constellation_summary: ['Sentinel-2'],
    gsd_summary: ['10m', '20m', '60m'],
    processing_level_summary: ['L2A']
  },
  {
    id: 2,
    title: 'Landsat 8 Collection 2',
    description: 'Landsat 8 operational land imager and thermal infrared sensor',
    spatial_extent: {
      type: 'Polygon',
      coordinates: [[[5.8663153, 47.2701114], [15.0419319, 47.2701114], [15.0419319, 55.099161], [5.8663153, 55.099161], [5.8663153, 47.2701114]]]
    },
    xmin: 5.8663153,
    ymin: 47.2701114,
    xmax: 15.0419319,
    ymax: 55.099161,
    temporal_start: '2013-04-01T00:00:00Z',
    temporal_end: '2024-12-31T23:59:59Z',
    license: 'CC0-1.0',
    keywords: ['landsat', 'satellite', 'multispectral'],
    providers: ['USGS', 'NASA'],
    doi: '10.5066/LANDSAT8',
    platform_summary: ['Landsat-8'],
    constellation_summary: ['Landsat'],
    gsd_summary: ['30m'],
    processing_level_summary: ['L1TP', 'L2SP']
  },
  {
    id: 3,
    title: 'MODIS Terra Daily',
    description: 'MODIS Terra daily surface reflectance product',
    spatial_extent: {
      type: 'Polygon',
      coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]]
    },
    xmin: -180,
    ymin: -90,
    xmax: 180,
    ymax: 90,
    temporal_start: '2000-02-24T00:00:00Z',
    temporal_end: '2024-12-31T23:59:59Z',
    license: 'proprietary',
    keywords: ['modis', 'terra', 'daily'],
    providers: ['NASA'],
    doi: '10.5067/MODIS/MOD09GA',
    platform_summary: ['Terra'],
    constellation_summary: ['Terra'],
    gsd_summary: ['1km'],
    processing_level_summary: ['L2']
  }
];

module.exports = {
  query: async (text, params) => {
    // Mock getCollections query
    if (text.includes('SELECT id, title, description, keywords')) {
      return { rows: mockCollections };
    }
    
    // Mock getCollectionById query
    if (text.includes('ST_XMin') && params && params.length > 0) {
      const collection = mockCollections.find(c => c.id == params[0]);
      return { rows: collection ? [collection] : [] };
    }
    
    return { rows: [] };
  }
};