// Update Vote endpoint - changes an existing vote to a new category
// Identifies the voter by search_id + vote_ip_address
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { query } = require('../lib/db');

async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { vote_id, previous_vote_id, search_id, vote_timestamp, vote_ip_address } = req.body;

    console.log('updateVote:', { vote_id, previous_vote_id, search_id, vote_ip_address });

    // Update a specific vote: change from previous_vote_id to vote_id
    // for this IP + search combination
    const updateQuery = `
      UPDATE have_votes
      SET vote_id = $1, vote_timestamp = $2
      WHERE vote_serial = (
        SELECT vote_serial FROM have_votes
        WHERE search_id = $3 AND vote_ip_address = $4 AND vote_id = $5
        ORDER BY vote_timestamp DESC
        LIMIT 1
      )
    `;
    const updateValues = [vote_id, vote_timestamp, search_id, vote_ip_address, previous_vote_id];

    const updateResult = await query(updateQuery, updateValues);
    console.log('updateVote rowCount:', updateResult.rowCount);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        error: 'No existing vote found',
        message: 'No vote exists for this search and IP address'
      });
    }

    // Return all vote counts for this search so frontend can refresh all counters
    const countQuery = `
      SELECT
        v.vote_id,
        v.vote_name,
        COUNT(hv.vote_id)::int AS vote_count
      FROM votes v
      LEFT JOIN have_votes hv ON v.vote_id = hv.vote_id AND hv.search_id = $1
      GROUP BY v.vote_id, v.vote_name
      ORDER BY v.vote_id
    `;

    const countResults = await query(countQuery, [search_id]);
    console.log('updateVote countResults:', countResults.rows);

    res.status(200).json({ vote_counts: countResults.rows });

  } catch (error) {
    console.error('Update vote endpoint error:', error);
    res.status(500).json({
      error: 'Failed to update vote',
      message: error.message
    });
  }
}

module.exports = allowCors(checkSecret(handler));
