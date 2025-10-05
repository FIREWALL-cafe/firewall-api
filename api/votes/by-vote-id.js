// Votes by Vote ID endpoint - migrated from queries.js getVoteByVoteID
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

// Import queryBuilder from main API
const { getFieldSet } = require('../queryBuilder');

async function handler(req, res) {
  try {
    const vote_id = parseInt(req.query.vote_id);

    if (!vote_id || isNaN(vote_id)) {
      return res.status(400).json({
        error: 'Invalid vote_id',
        message: 'vote_id parameter is required and must be a number'
      });
    }

    console.log('Votes by vote ID endpoint called:', vote_id);

    const fields = getFieldSet('all', 's');
    const sqlQuery = `
      SELECT v.vote_name, hv.*, ${fields}
      FROM searches s
      INNER JOIN have_votes hv ON s.search_id = hv.search_id
      INNER JOIN votes v ON hv.vote_id = v.vote_id
      WHERE hv.vote_id = $1
    `;

    const results = await query(sqlQuery, [vote_id]);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Votes by vote ID endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch votes by vote ID',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
