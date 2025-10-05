// Geographic Analytics endpoint - migrated from queries.js getGeographicAnalytics
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('Geographic analytics endpoint called');

    // Query geographic data from search_country field
    const mainQuery = `
      SELECT
        search_country as location,
        search_country_code as country_code,
        COUNT(*) as search_count,
        ROUND(
          (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM searches WHERE search_country IS NOT NULL)),
          1
        ) as percentage
      FROM searches
      WHERE search_country IS NOT NULL
      GROUP BY search_country, search_country_code
      ORDER BY search_count DESC
      LIMIT 15
    `;

    const results = await query(mainQuery);

    // If no IP-based data, fall back to location-based
    if (results.rows.length === 0) {
      const fallbackQuery = `
        SELECT
          search_location as location,
          COUNT(*) as search_count,
          ROUND(
            (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM searches WHERE search_location IS NOT NULL AND search_location != 'automated_scraper' AND search_location != 'nyc3')),
            1
          ) as percentage
        FROM searches
        WHERE search_location IS NOT NULL
        AND search_location != 'automated_scraper'
        AND search_location != 'nyc3'
        GROUP BY search_location
        ORDER BY search_count DESC
        LIMIT 15
      `;

      const fallbackResults = await query(fallbackQuery);
      return res.status(200).json(fallbackResults.rows);
    }

    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Geographic analytics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch geographic analytics',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
