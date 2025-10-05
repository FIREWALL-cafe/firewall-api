// Update Image URL endpoint - migrated from queries.js updateImageUrl
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { query } = require('../lib/db');

async function handler(req, res) {
  try {
    const { url, image_id } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Missing URL',
        message: 'New image URL must be defined and non-empty'
      });
    }

    if (!image_id) {
      return res.status(400).json({
        error: 'Missing image_id',
        message: 'image_id is required'
      });
    }

    console.log('updateImageUrl:', { url, image_id });

    const updateQuery = 'UPDATE images SET image_href=$1 WHERE image_id=$2';
    const results = await query(updateQuery, [url, image_id]);

    res.status(200).json({
      url,
      image_id,
      updated: results.rowCount
    });

  } catch (error) {
    console.error('Update image endpoint error:', error);
    res.status(500).json({
      error: 'Failed to update image URL',
      message: error.message
    });
  }
}

// Apply authentication and CORS
module.exports = allowCors(checkSecret(handler));
