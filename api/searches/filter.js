// Filtered Searches endpoint - migrated from queries.js getFilteredSearches
const { allowCors } = require('../../lib/cors');
const { query } = require('../../lib/db');
const { getPaginationParams, formatPaginatedResponse } = require('../../lib/pagination');
const { parseFilterParams, getFilterConditions } = require('../../lib/filter-builder');

async function handler(req, res) {
  try {
    console.log('getFilteredSearches:', req.query);

    // Parse and validate filter parameters
    let filters;
    try {
      filters = parseFilterParams(req.query);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          error: error.error,
          message: error.message,
          ...(error.provided && { provided: error.provided }),
          ...(error.search_location && { search_location: error.search_location }),
          ...(error.us_states && { us_states: error.us_states }),
          ...(error.countries && { countries: error.countries })
        });
      }
      throw error;
    }

    const { page, pageSize, offset } = getPaginationParams(req.query);

    // Base queries
    let baseQuery = `
      SELECT
        s.search_id,
        s.search_timestamp,
        search_location,
        search_country,
        search_country_code,
        search_region,
        search_city,
        search_latitude,
        search_longitude,
        search_ip_address,
        search_client_name,
        search_engine_initial,
        search_term_initial,
        search_term_initial_language_code,
        search_term_translation,
        search_engine_translation,
        search_term_status_banned,
        COUNT(hv.vote_id) as "total_votes"
      FROM searches s
      LEFT JOIN have_votes hv ON s.search_id = hv.search_id
      WHERE s.search_location != 'nyc3' AND s.search_location != 'automated_scraper'
    `;

    let countQuery = `
      SELECT COUNT(*)
      FROM searches s
      WHERE s.search_location != 'nyc3' AND s.search_location != 'automated_scraper'
    `;

    // Check if any filters are applied
    const hasFilters =
      (filters.vote_ids.length > 0) ||
      (filters.search_locations.length > 0) ||
      (filters.us_states.length > 0) ||
      (filters.countries.length > 0) ||
      (filters.years.length > 0) ||
      filters.keyword ||
      filters.start_date ||
      filters.end_date;

    if (hasFilters) {
      const conditionClause = ' AND ' + getFilterConditions(
        filters.keyword,
        filters.vote_ids,
        filters.search_locations,
        filters.us_states,
        filters.countries,
        filters.years,
        filters.start_date,
        filters.end_date
      );
      countQuery += conditionClause;
      baseQuery += conditionClause;
    }

    // Get total count first
    const countResult = await query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    // Then get paginated data
    const dataQuery = baseQuery + `
      GROUP BY s.search_id
      ORDER BY s.search_timestamp DESC
      LIMIT $1 OFFSET $2
    `;

    const results = await query(dataQuery, [pageSize, offset]);

    // Format response with pagination metadata
    const response = formatPaginatedResponse(results.rows, total, page, pageSize);
    res.status(200).json(response);

  } catch (error) {
    console.error('Filtered searches endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch filtered searches',
      message: error.message
    });
  }
}

module.exports = allowCors(handler);
