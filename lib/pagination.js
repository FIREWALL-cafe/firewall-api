'use strict';

/**
 * Extract and validate pagination parameters from query string
 * @param {Object} query - Query parameters object
 * @returns {Object} Pagination parameters
 */
function getPaginationParams(query) {
  const page = parseInt(query.page) || 1;
  const pageSize = parseInt(query.page_size) || parseInt(query.limit) || 25;
  const offset = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    offset,
    limit: pageSize,
  };
}

/**
 * Format data with pagination metadata
 * @param {Array} data - Result data
 * @param {number} total - Total count of records
 * @param {number} page - Current page number
 * @param {number} pageSize - Page size
 * @returns {Object} Formatted response with pagination metadata
 */
function formatPaginatedResponse(data, total, page, pageSize) {
  return {
    total,
    page,
    page_size: pageSize,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  };
}

module.exports = {
  getPaginationParams,
  formatPaginatedResponse,
};
