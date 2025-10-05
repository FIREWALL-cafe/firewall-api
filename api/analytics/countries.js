// Countries List endpoint - migrated from queries.js getCountriesList
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('Countries list endpoint called');

    const sqlQuery = `
      SELECT DISTINCT
        search_country as name,
        search_country_code as code,
        COUNT(*) as search_count
      FROM searches
      WHERE search_country IS NOT NULL
      AND search_country != ''
      GROUP BY search_country, search_country_code
      ORDER BY search_count DESC
    `;

    const results = await query(sqlQuery);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Countries list endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch countries list',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
