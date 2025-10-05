// Search Analytics endpoint - migrated from queries.js getSearchAnalytics
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('Search analytics endpoint called');

    // Execute all queries in parallel
    const [searchVolumeResult, topTermsResult, languagesResult, searchEnginesResult] = await Promise.all([
      // Search volume over the last 30 days
      query(`
        SELECT
          DATE(TO_TIMESTAMP(search_timestamp::bigint / 1000)) as search_date,
          COUNT(*) as search_count
        FROM searches
        WHERE search_location != 'automated_scraper'
        AND search_location != 'nyc3'
        AND TO_TIMESTAMP(search_timestamp::bigint / 1000) >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(TO_TIMESTAMP(search_timestamp::bigint / 1000))
        ORDER BY search_date DESC
        LIMIT 30
      `),

      // Top 10 search terms
      query(`
        SELECT
          search_term_initial as term,
          COUNT(*) as search_count
        FROM searches
        WHERE search_location != 'automated_scraper'
        AND search_location != 'nyc3'
        AND search_term_initial IS NOT NULL
        AND search_term_initial != ''
        GROUP BY search_term_initial
        ORDER BY search_count DESC
        LIMIT 10
      `),

      // Language distribution
      query(`
        SELECT
          COALESCE(search_term_initial_language_code, 'unknown') as language,
          COUNT(*) as search_count,
          ROUND(
            (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM searches WHERE search_location != 'automated_scraper' AND search_location != 'nyc3')),
            1
          ) as percentage
        FROM searches
        WHERE search_location != 'automated_scraper'
        AND search_location != 'nyc3'
        GROUP BY search_term_initial_language_code
        ORDER BY search_count DESC
      `),

      // Search engine usage
      query(`
        SELECT
          search_engine_initial as engine,
          COUNT(*) as search_count,
          ROUND(
            (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM searches WHERE search_location != 'automated_scraper' AND search_location != 'nyc3')),
            1
          ) as percentage
        FROM searches
        WHERE search_location != 'automated_scraper'
        AND search_location != 'nyc3'
        AND search_engine_initial IS NOT NULL
        GROUP BY search_engine_initial
        ORDER BY search_count DESC
      `)
    ]);

    const analyticsData = {
      searchVolume: searchVolumeResult.rows,
      topTerms: topTermsResult.rows,
      languages: languagesResult.rows,
      searchEngines: searchEnginesResult.rows
    };

    res.status(200).json(analyticsData);

  } catch (error) {
    console.error('Search analytics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch search analytics',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
