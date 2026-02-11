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
      SELECT i.image_id, i.image_search_engine, i.image_href, i.image_href_original, i.image_rank, i.image_mime_type, i.image_data
      FROM searches s
      FULL JOIN images i ON s.search_id = i.search_id
      WHERE s.search_id = $1 AND (i.image_href <> '' OR i.image_href IS NOT NULL OR i.image_data IS NOT NULL)
    `;

    const results = await query(sqlQuery, [search_id]);

    // Convert binary image_data to base64 data URI for old records
    const rows = results.rows.map(row => {
      if (row.image_data && !row.image_href) {
        const mime = row.image_mime_type || 'image/jpeg';
        const base64 = Buffer.from(row.image_data).toString('base64');
        row.image_data = `data:${mime};base64,${base64}`;
      } else {
        delete row.image_data;
      }
      return row;
    });

    res.status(200).json(rows);

  } catch (error) {
    console.error('Images by search ID endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch images by search ID',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
