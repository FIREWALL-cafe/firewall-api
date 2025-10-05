// Search Locations List endpoint - migrated from queries.js getSearchLocationsList
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

// Import event data from the main API directory
const eventData = require('../../../api/event-data.js');

async function handler(req, res) {
  try {
    console.log('Search locations endpoint called');

    const searchLocations = eventData.map(event => event.search_location);
    if (searchLocations.length === 0) {
      console.log('No search locations found');
      return res.status(200).json([]);
    }

    const sqlQuery = `
      WITH locations AS (
        SELECT unnest($1::text[]) as search_location
      )
      SELECT
        l.search_location,
        COALESCE(COUNT(s.search_id), 0) as search_count
      FROM locations l
      LEFT JOIN searches s ON s.search_location = l.search_location
      GROUP BY l.search_location
      ORDER BY search_count DESC, l.search_location ASC
    `;

    const results = await query(sqlQuery, [searchLocations]);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Search locations endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch search locations',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
