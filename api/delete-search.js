// Delete Search endpoint - migrated from queries.js deleteSearch
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { query } = require('../lib/db');

async function handler(req, res) {
  try {
    const { search_id } = req.body;

    if (!search_id) {
      return res.status(400).json({
        error: 'Missing search_id',
        message: 'search_id is required in request body'
      });
    }

    console.log('deleteSearch:', search_id);

    const deleteQuery = 'DELETE FROM searches WHERE search_id = $1';
    const results = await query(deleteQuery, [search_id]);

    res.status(200).json({
      message: 'Search deleted successfully',
      search_id,
      deleted: results.rowCount
    });

  } catch (error) {
    console.error('Delete search endpoint error:', error);
    res.status(500).json({
      error: 'Failed to delete search',
      message: error.message
    });
  }
}

// Apply authentication and CORS
module.exports = allowCors(checkSecret(handler));
