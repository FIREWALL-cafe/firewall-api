// All Images endpoint - migrated from queries.js getImages
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');
const { getPaginationParams, formatPaginatedResponse } = require('../../lib/pagination');

async function handler(req, res) {
  try {
    console.log('All images endpoint called');

    const { page, pageSize, offset } = getPaginationParams(req.query);

    // Get total count first
    const countResult = await query('SELECT COUNT(*) FROM images');
    const total = parseInt(countResult.rows[0].count);

    // Then get paginated data
    const dataQuery = `
      SELECT i.image_id, i.image_search_engine, i.image_href, i.image_href_original, i.image_rank, i.image_mime_type
      FROM images i
      ORDER BY i.image_id DESC
      LIMIT $1 OFFSET $2
    `;

    const results = await query(dataQuery, [pageSize, offset]);

    const response = formatPaginatedResponse(results.rows, total, page, pageSize);
    res.status(200).json(response);

  } catch (error) {
    console.error('All images endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch images',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
