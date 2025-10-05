// Vote Analytics endpoint - migrated from queries.js getVoteAnalytics
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');

async function handler(req, res) {
  try {
    console.log('Vote analytics endpoint called');

    // Vote categories mapping based on existing code
    const voteCategories = [
      { id: 1, name: 'Censored', color: '#ef4444' },
      { id: 2, name: 'Uncensored', color: '#22c55e' },
      { id: 3, name: 'Bad Translation', color: '#f97316' },
      { id: 4, name: 'Good Translation', color: '#3b82f6' },
      { id: 5, name: 'Lost in Translation', color: '#8b5cf6' },
      { id: 6, name: 'NSFW', color: '#ec4899' },
      { id: 7, name: 'WTF', color: '#6b7280' }
    ];

    // Execute all queries in parallel
    const [voteCategoryResult, voteTimelineResult, topVotedSearchesResult] = await Promise.all([
      // Vote category breakdown
      query(`
        SELECT
          vote_id,
          COUNT(*) as vote_count
        FROM have_votes hv
        JOIN searches s ON hv.search_id = s.search_id
        WHERE s.search_location != 'automated_scraper'
        AND s.search_location != 'nyc3'
        GROUP BY vote_id
        ORDER BY vote_id
      `),

      // Vote timeline over last 30 days
      query(`
        SELECT
          DATE(TO_TIMESTAMP(s.search_timestamp::bigint / 1000)) as vote_date,
          COUNT(*) as vote_count
        FROM have_votes hv
        JOIN searches s ON hv.search_id = s.search_id
        WHERE s.search_location != 'automated_scraper'
        AND s.search_location != 'nyc3'
        AND TO_TIMESTAMP(s.search_timestamp::bigint / 1000) >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(TO_TIMESTAMP(s.search_timestamp::bigint / 1000))
        ORDER BY vote_date DESC
        LIMIT 30
      `),

      // Top voted searches (most controversial)
      query(`
        SELECT
          s.search_term_initial,
          COUNT(hv.vote_id) as total_votes,
          s.search_location
        FROM searches s
        JOIN have_votes hv ON s.search_id = hv.search_id
        WHERE s.search_location != 'automated_scraper'
        AND s.search_location != 'nyc3'
        AND s.search_term_initial IS NOT NULL
        GROUP BY s.search_id, s.search_term_initial, s.search_location
        ORDER BY total_votes DESC
        LIMIT 10
      `)
    ]);

    // Process vote categories with names and percentages
    const totalVotes = voteCategoryResult.rows.reduce((sum, vote) => sum + parseInt(vote.vote_count), 0);
    const voteCategories_processed = voteCategories.map(category => {
      const voteData = voteCategoryResult.rows.find(v => parseInt(v.vote_id) === category.id);
      const count = voteData ? parseInt(voteData.vote_count) : 0;
      const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';

      return {
        ...category,
        count,
        percentage: parseFloat(percentage)
      };
    });

    const analyticsData = {
      voteCategories: voteCategories_processed,
      voteTimeline: voteTimelineResult.rows,
      topVotedSearches: topVotedSearchesResult.rows,
      totalVotes
    };

    res.status(200).json(analyticsData);

  } catch (error) {
    console.error('Vote analytics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch vote analytics',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
