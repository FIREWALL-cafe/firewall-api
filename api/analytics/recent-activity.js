// Recent Activity endpoint - migrated from queries.js getRecentActivity
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('Recent activity endpoint called');

    const sqlQuery = `
      SELECT
        s.search_id,
        s.search_timestamp,
        s.search_location,
        s.search_client_name,
        s.search_term_initial,
        s.search_term_translation,
        s.search_term_initial_language_code,
        s.search_engine_initial,
        s.search_ip_address,
        COUNT(hv.vote_id) as vote_count
      FROM searches s
      LEFT JOIN have_votes hv ON s.search_id = hv.search_id
      WHERE s.search_location != 'automated_scraper'
      AND s.search_location != 'nyc3'
      AND s.search_term_initial IS NOT NULL
      AND s.search_term_initial != ''
      GROUP BY s.search_id, s.search_timestamp, s.search_location,
               s.search_client_name, s.search_term_initial, s.search_term_translation,
               s.search_term_initial_language_code, s.search_engine_initial, s.search_ip_address
      ORDER BY s.search_timestamp DESC
      LIMIT 20
    `;

    const results = await query(sqlQuery);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Recent activity endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent activity',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
