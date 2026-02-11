// Images by Search ID endpoint - migrated from queries.js getImagesOnlyBySearchID
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

    console.log('Images by search ID endpoint called:', search_id);

    const sqlQuery = `
      SELECT i.image_id, i.image_search_engine, i.image_href, i.image_href_original, i.image_rank, i.image_mime_type,
        CASE WHEN (i.image_href IS NULL OR i.image_href = '') AND i.image_data IS NOT NULL
          THEN 'data:' || COALESCE(i.image_mime_type, 'image/jpeg') || ';base64,' || encode(i.image_data, 'base64')
          ELSE NULL
        END as image_data
      FROM searches s
      FULL JOIN images i ON s.search_id = i.search_id
      WHERE s.search_id = $1
        AND ((i.image_href IS NOT NULL AND i.image_href <> '') OR i.image_data IS NOT NULL)
    `;

    const results = await query(sqlQuery, [search_id]);
    res.status(200).json(results.rows);

  } catch (error) {
    console.error('Images by search ID endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch images by search ID',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
