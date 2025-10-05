// Create Vote endpoint - migrated from queries.js createVote
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { query } = require('../lib/db');

async function handler(req, res) {
  try {
    const { vote_id, search_id, vote_timestamp, vote_client_name, vote_ip_address } = req.body;

    console.log('createVote:', vote_id, search_id, vote_timestamp, vote_client_name, vote_ip_address);

    // Insert vote
    const insertQuery = 'INSERT INTO have_votes (vote_id, search_id, vote_timestamp, vote_client_name, vote_ip_address) VALUES ($1, $2, $3, $4, $5)';
    const insertValues = [vote_id, search_id, vote_timestamp, vote_client_name, vote_ip_address];

    const insertResults = await query(insertQuery, insertValues);
    console.log('createVote insertResults:', insertResults.rows);

    // Get vote count for this search and vote type
    const countQuery = `
      SELECT hv.vote_id, v.vote_name, COUNT(hv.vote_id) as vote_count
      FROM votes v
      LEFT JOIN have_votes hv ON v.vote_id = hv.vote_id AND hv.search_id = $1
      WHERE v.vote_id = $2
      GROUP BY hv.vote_id, v.vote_name
      ORDER BY v.vote_name
    `;

    const countResults = await query(countQuery, [search_id, vote_id]);
    console.log('createVote countResults:', countResults.rows[0]);

    res.status(201).json(countResults.rows[0]);

  } catch (error) {
    console.error('Create vote endpoint error:', error);
    res.status(500).json({
      error: 'Failed to create vote',
      message: error.message
    });
  }
}

// Apply authentication and CORS
module.exports = allowCors(checkSecret(handler));
