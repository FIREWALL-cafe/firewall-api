// Image Analytics endpoint - engine split, volume, and censorship gap analysis
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('Image analytics endpoint called');

    // Execute all queries in parallel
    const [engineSplitResult, imageVolumeResult, censorshipGapResult] = await Promise.all([
      // Google vs Baidu image counts with percentages
      query(`
        SELECT
          image_search_engine as engine,
          COUNT(*) as image_count,
          ROUND(
            (COUNT(*) * 100.0 / (
              SELECT COUNT(*) FROM images i2
              JOIN searches s2 ON i2.search_id = s2.search_id
              WHERE s2.search_location != 'automated_scraper'
              AND s2.search_location != 'nyc3'
            )), 1
          ) as percentage
        FROM images i
        JOIN searches s ON i.search_id = s.search_id
        WHERE s.search_location != 'automated_scraper'
        AND s.search_location != 'nyc3'
        AND image_search_engine IS NOT NULL
        GROUP BY image_search_engine
        ORDER BY image_count DESC
      `),

      // Daily image count, last 30 days
      query(`
        SELECT
          DATE(TO_TIMESTAMP(s.search_timestamp::bigint / 1000)) as image_date,
          COUNT(*) as image_count
        FROM images i
        JOIN searches s ON i.search_id = s.search_id
        WHERE s.search_location != 'automated_scraper'
        AND s.search_location != 'nyc3'
        AND TO_TIMESTAMP(s.search_timestamp::bigint / 1000) >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(TO_TIMESTAMP(s.search_timestamp::bigint / 1000))
        ORDER BY image_date DESC
        LIMIT 30
      `),

      // Avg images per search by engine, for censored vs uncensored votes
      query(`
        SELECT
          i.image_search_engine as engine,
          CASE WHEN hv.vote_id = 1 THEN 'censored' WHEN hv.vote_id = 2 THEN 'uncensored' END as vote_type,
          ROUND(COUNT(DISTINCT i.image_id)::numeric / NULLIF(COUNT(DISTINCT s.search_id), 0), 2) as avg_images,
          COUNT(DISTINCT s.search_id) as search_count
        FROM searches s
        JOIN have_votes hv ON s.search_id = hv.search_id
        JOIN images i ON s.search_id = i.search_id
        WHERE s.search_location != 'automated_scraper'
        AND s.search_location != 'nyc3'
        AND hv.vote_id IN (1, 2)
        AND i.image_search_engine IS NOT NULL
        GROUP BY i.image_search_engine, hv.vote_id
        ORDER BY i.image_search_engine, hv.vote_id
      `)
    ]);

    const analyticsData = {
      engineSplit: engineSplitResult.rows,
      imageVolume: imageVolumeResult.rows,
      censorshipGap: censorshipGapResult.rows
    };

    res.status(200).json(analyticsData);

  } catch (error) {
    console.error('Image analytics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch image analytics',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
