// Years analytics endpoint - unique years with search counts
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('Years analytics endpoint called');

    const sqlQuery = `
      SELECT
        EXTRACT(YEAR FROM to_timestamp(search_timestamp / 1000.0))::int AS year,
        COUNT(*) AS search_count
      FROM searches
      WHERE search_timestamp IS NOT NULL
      GROUP BY year
      ORDER BY year DESC
    `;

    const results = await query(sqlQuery);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Years analytics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch years analytics',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
