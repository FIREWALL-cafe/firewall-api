// All Votes endpoint - migrated from queries.js getAllVotes
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');
const { getPaginationParams } = require('../../lib/pagination');

// Import queryBuilder from main API
const { getFieldSet } = require('../../../api/queryBuilder');

async function handler(req, res) {
  try {
    console.log('All votes endpoint called');

    const { page, pageSize, offset } = getPaginationParams(req.query);

    const fields = getFieldSet('all', 's');
    const sqlQuery = `
      SELECT v.vote_name, ${fields}, hv.*
      FROM searches s
      INNER JOIN have_votes hv ON s.search_id = hv.search_id
      INNER JOIN votes v ON hv.vote_id = v.vote_id
      ORDER BY s.search_timestamp DESC
      LIMIT $1 OFFSET $2
    `;

    const results = await query(sqlQuery, [pageSize, offset]);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('All votes endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch votes',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
