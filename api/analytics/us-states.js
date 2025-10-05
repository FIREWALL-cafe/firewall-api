// US States Analytics endpoint - migrated from queries.js getUSStatesAnalytics
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('US States analytics endpoint called');

    // Query US states data from search_region field
    const sqlQuery = `
      SELECT
        search_region as state,
        COUNT(*) as search_count,
        ROUND(
          (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM searches WHERE search_country = 'United States' AND search_region IS NOT NULL)),
          1
        ) as percentage
      FROM searches
      WHERE search_country_code = 'US'
      AND search_region IS NOT NULL
      AND search_region != ''
      GROUP BY search_region
      ORDER BY search_count DESC
    `;

    const results = await query(sqlQuery);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('US States analytics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch US states analytics',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
