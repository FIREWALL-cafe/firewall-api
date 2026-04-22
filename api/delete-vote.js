// Delete Vote endpoint - removes a vote for a specific category
// Identifies the vote by search_id + vote_ip_address + vote_id
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { query } = require('../lib/db');

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { vote_id, search_id, vote_ip_address } = req.body;

    console.log('deleteVote:', { vote_id, search_id, vote_ip_address });

    // Delete the most recent vote for this IP + search + category
    const deleteQuery = `
      DELETE FROM have_votes
      WHERE vote_serial = (
        SELECT vote_serial FROM have_votes
        WHERE search_id = $1 AND vote_ip_address = $2 AND vote_id = $3
        ORDER BY vote_timestamp DESC
        LIMIT 1
      )
    `;

    const deleteResult = await query(deleteQuery, [search_id, vote_ip_address, vote_id]);
    console.log('deleteVote rowCount:', deleteResult.rowCount);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        error: 'No existing vote found',
        message: 'No vote exists for this search, IP, and category'
      });
    }

    // Return all vote counts so frontend can refresh
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
    res.status(200).json({ vote_counts: countResults.rows });

  } catch (error) {
    console.error('Delete vote endpoint error:', error);
    res.status(500).json({
      error: 'Failed to delete vote',
      message: error.message
    });
  }
}

module.exports = allowCors(checkSecret(handler));
