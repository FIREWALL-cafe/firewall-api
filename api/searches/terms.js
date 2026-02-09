const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');
const { getPaginationParams, formatPaginatedResponse } = require('../../lib/pagination');

async function handler(req, res) {
  try {
    const term = req.query.term;
    if (!term) {
      return res.status(400).json({ error: 'term parameter is required' });
    }

    console.log('Searches by term endpoint called with term:', term);

    const { page, pageSize, offset } = getPaginationParams(req.query);

    // Detect if the search term contains CJK characters
    const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(term);

    // Common filter for excluding automated data
    const excludeFilter = `AND s.search_location != 'nyc3' AND s.search_location != 'automated_scraper'`;

    // Build WHERE clause based on language detection
    let whereClause;
    if (hasCJK) {
      // CJK input: search for Chinese/Japanese/Korean original searches
      console.log(`Searching for CJK original searches: ${term}`);
      whereClause = `(
        s.search_term_initial LIKE '%' || $1 || '%'
        AND s.search_term_initial_language_code IN ('zh', 'ja', 'ko')
      )`;
    } else {
      // English input: search for English original searches
      console.log(`Searching for English original searches: ${term}`);
      whereClause = `(
        (to_tsvector('english', COALESCE(s.search_term_initial, '')) @@ plainto_tsquery('english', $1)
         OR s.search_term_initial ILIKE '%' || $1 || '%')
        AND s.search_term_initial_language_code = 'en'
      )`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT s.search_id)
      FROM searches s
      LEFT JOIN have_votes hv ON s.search_id = hv.search_id
      WHERE ${whereClause}
      ${excludeFilter}
    `;

    console.log('Full count query:', countQuery);
    console.log('Query params:', [term]);

    const countResult = await query(countQuery, [term]);
    const total = parseInt(countResult.rows[0].count);
    console.log('Count result:', total);

    // Get paginated data
    const dataQuery = `
      SELECT s.search_id, s.search_timestamp, search_location, search_ip_address,
        search_client_name, search_engine_initial, search_term_initial, search_term_initial_language_code,
        search_term_translation, search_engine_translation, search_term_status_banned,
        COUNT(hv.vote_id) as "total_votes"
      FROM searches s
      LEFT JOIN have_votes hv ON s.search_id = hv.search_id
      WHERE ${whereClause}
      ${excludeFilter}
      GROUP BY s.search_id
      ORDER BY s.search_id DESC
      LIMIT $2 OFFSET $3
    `;

    const results = await query(dataQuery, [term, pageSize, offset]);

    const response = formatPaginatedResponse(results.rows, total, page, pageSize);
    res.status(200).json(response);

  } catch (error) {
    console.error('Searches by term endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch searches by term',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
