// Vote counts by Search ID endpoint - ported from old queries.js getVoteCountsBySearchId
// Returns per-category vote counts for a single search, including zeros for categories with no votes.
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    const search_id = parseInt(req.query.search_id);

    if (!search_id || isNaN(search_id)) {
      return res.status(400).json({
        error: 'Invalid search_id',
        message: 'search_id parameter is required and must be a number'
      });
    }

    console.log('Vote counts by search ID endpoint called:', search_id);

    const sqlQuery = `
      SELECT
        v.vote_id,
        v.vote_name,
        COUNT(hv.vote_id)::int AS vote_count
      FROM votes v
      LEFT JOIN have_votes hv ON v.vote_id = hv.vote_id AND hv.search_id = $1
      GROUP BY v.vote_id, v.vote_name
      ORDER BY v.vote_id
    `;

    const results = await query(sqlQuery, [search_id]);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Vote counts by search ID endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch vote counts by search ID',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
