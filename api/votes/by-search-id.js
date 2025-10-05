// Votes by Search ID endpoint - migrated from queries.js getVoteBySearchID
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

// Import queryBuilder from main API
const { getFieldSet } = require('../queryBuilder');

async function handler(req, res) {
  try {
    const search_id = parseInt(req.query.search_id);

    if (!search_id || isNaN(search_id)) {
      return res.status(400).json({
        error: 'Invalid search_id',
        message: 'search_id parameter is required and must be a number'
      });
    }

    console.log('Votes by search ID endpoint called:', search_id);

    const fields = getFieldSet('all', 's');
    const sqlQuery = `
      SELECT v.vote_name, hv.*, ${fields}
      FROM searches s
      INNER JOIN have_votes hv ON s.search_id = hv.search_id
      INNER JOIN votes v ON hv.vote_id = v.vote_id
      WHERE s.search_id = $1
    `;

    const results = await query(sqlQuery, [search_id]);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Votes by search ID endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch votes by search ID',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
