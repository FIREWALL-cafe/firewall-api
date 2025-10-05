// Delete Image endpoint - migrated from queries.js deleteImage
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { query } = require('../lib/db');

async function handler(req, res) {
  try {
    const { image_id } = req.body;

    if (!image_id) {
      return res.status(400).json({
        error: 'Missing image_id',
        message: 'image_id is required in request body'
      });
    }

    console.log('deleteImage:', image_id);

    const deleteQuery = 'DELETE FROM images WHERE image_id = $1';
    const results = await query(deleteQuery, [image_id]);

    res.status(200).json({
      message: 'Image deleted successfully',
      image_id,
      deleted: results.rowCount
    });

  } catch (error) {
    console.error('Delete image endpoint error:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      message: error.message
    });
  }
}

// Apply authentication and CORS
module.exports = allowCors(checkSecret(handler));
