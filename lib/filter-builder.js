'use strict';

/**
 * Get type of value (handles null, array, date)
 */
function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * Build SQL filter conditions based on provided filters
 * Extracted from queries.js getFilterConditions
 */
function getFilterConditions(keyword, vote_ids, search_locations, us_states, countries, years, start_date, end_date) {
  const conditions = [];

  if (keyword) {
    conditions.push(`to_tsvector(s.search_term_initial) @@ plainto_tsquery('${keyword}')`);
  }

  if (vote_ids && vote_ids.length > 0) {
    const voteConditions = vote_ids.map(vote_id => `hv.vote_id = '${vote_id}'`).join(' OR ');
    conditions.push(`s.search_id IN (SELECT search_id FROM have_votes WHERE ${voteConditions})`);
  }

  if (search_locations && search_locations.length > 0) {
    const locationConditions = search_locations.map(loc => `s.search_location = '${loc}'`).join(' OR ');
    conditions.push(`(${locationConditions})`);
  }

  if (us_states && us_states.length > 0) {
    const stateConditions = us_states.map(state => `s.search_region = '${state}'`).join(' OR ');
    conditions.push(`(${stateConditions})`);
  }

  if (countries && countries.length > 0) {
    const countryConditions = countries.map(country => `s.search_country_code = '${country}'`).join(' OR ');
    conditions.push(`(${countryConditions})`);
  }

  if (years && years.length > 0) {
    const yearConditions = years.map(year => {
      const yearStart = new Date(`${year}-01-01`).getTime();
      const yearEnd = new Date(`${year}-12-31`).getTime();
      return `(s.search_timestamp >= ${yearStart} AND s.search_timestamp <= ${yearEnd})`;
    }).join(' OR ');
    conditions.push(`(${yearConditions})`);
  }

  if (start_date) {
    conditions.push(`to_timestamp(s.search_timestamp/1000) >= '${start_date} 00:00:00'::timestamp`);
  }

  if (end_date) {
    conditions.push(`to_timestamp(s.search_timestamp/1000) <= '${end_date} 23:59:59'::timestamp`);
  }

  return conditions.join(' AND ');
}

/**
 * Parse and validate filter parameters from request query
 */
function parseFilterParams(query) {
  const extractData = (data) => {
    try {
      return JSON.parse(data ? data : '[]');
    } catch (e) {
      return [];
    }
  };

  let vote_ids = extractData(query.vote_ids);

  // Handle search_locations - only one allowed
  let search_locations = [];
  if (getType(query.search_locations) === 'string') {
    search_locations = [query.search_locations];
  } else if (getType(query.search_locations) === 'array') {
    if (query.search_locations.length > 1) {
      throw {
        status: 400,
        error: 'Multiple search_locations not allowed',
        message: 'Only one search_location can be selected at a time',
        provided: query.search_locations
      };
    }
    search_locations = query.search_locations;
  }

  // Handle us_states parameter
  let us_states_filter = [];
  if (query.us_states) {
    if (getType(query.us_states) === 'string') {
      us_states_filter = [query.us_states];
    } else if (getType(query.us_states) === 'array') {
      us_states_filter = query.us_states;
    }
  }

  // Handle countries parameter
  let countries_filter = [];
  if (query.countries) {
    if (getType(query.countries) === 'string') {
      countries_filter = [query.countries];
    } else if (getType(query.countries) === 'array') {
      countries_filter = query.countries;
    }
  }

  // Ensure search_location and geographic filters are mutually exclusive
  if (search_locations.length > 0 && (us_states_filter.length > 0 || countries_filter.length > 0)) {
    throw {
      status: 400,
      error: 'Conflicting filters',
      message: 'Cannot use search_location with geographic filters (us_states or countries). Use either search_location OR geographic filters, not both.',
      search_location: search_locations[0],
      us_states: us_states_filter,
      countries: countries_filter
    };
  }

  const years = query.years ? [extractData(query.years)] : [];
  const keyword = query.keyword || query.query || null;
  const start_date = query.start_date || null;
  const end_date = query.end_date || null;

  return {
    keyword,
    vote_ids,
    search_locations,
    us_states: us_states_filter,
    countries: countries_filter,
    years,
    start_date,
    end_date
  };
}

module.exports = {
  getType,
  getFilterConditions,
  parseFilterParams
};
