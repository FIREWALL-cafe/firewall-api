'use strict';

const locationByTimeRange = require('./location-time-ranges');

// Synthetic locations that weren't tagged in the postgres db
const syntheticLocations = ['miami_beach', 'taiwan', 'new_jersey'];

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
 * Create a timestamp by year formatted for psql
 */
function createTimestamp(year) {
  return new Date(year, 0, 1)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '')
    .replace(/\.[0-9]+/, '-00');
}

/**
 * Build SQL filter conditions based on provided filters.
 * Ported from server/api/queries.js getFilterConditions.
 */
function getFilterConditions(keyword, vote_ids, search_locations, us_states, countries, years, start_date, end_date) {
  const conditions = [];

  // Keyword search using full-text search
  if (keyword) {
    conditions.push(`to_tsvector(s.search_term_initial) @@ plainto_tsquery('${keyword}')`);
  }

  // Filter by vote ids (hv is already joined in the base query)
  if (vote_ids && vote_ids.length > 0) {
    if (vote_ids.length > 1) {
      const condition = vote_ids
        .map(id => `hv.vote_id = ${parseInt(id)}`)
        .join(' OR ');
      conditions.push(`(${condition})`);
    } else {
      conditions.push(`hv.vote_id = ${parseInt(vote_ids[0])}`);
    }
  }

  // Filter locations that weren't tagged in the postgres db
  const filteredLocations = search_locations.filter(loc => !syntheticLocations.includes(loc));

  // Approximate missing locations by using timestamps
  const getApproximatedLocations = (location) => {
    return `to_timestamp(s.search_timestamp/1000) BETWEEN '${location.time1}' AND '${location.time2}'`;
  };

  // Filter by location (using search_location column)
  if (filteredLocations.length > 0) {
    if (search_locations.length > 1) {
      let condition = filteredLocations
        .map(name => `s.search_location = '${name}'`);

      search_locations.forEach(location => {
        if (locationByTimeRange[location]) {
          condition.push(getApproximatedLocations(locationByTimeRange[location]));
        }
      });

      condition = condition.join(' OR ');
      conditions.push(`(${condition})`);
    } else {
      conditions.push(`s.search_location = '${filteredLocations[0]}'`);
    }
  } else if (!filteredLocations.length && search_locations.length > 0) {
    // Get locations that are not in the postgres db (synthetic only)
    const syntheticConditions = [];
    search_locations.forEach(location => {
      if (locationByTimeRange[location]) {
        syntheticConditions.push(getApproximatedLocations(locationByTimeRange[location]));
      }
    });
    if (syntheticConditions.length > 0) {
      conditions.push(`(${syntheticConditions.join(' OR ')})`);
    }
  }

  // Filter by US states (using search_region field)
  if (us_states && us_states.length > 0) {
    if (us_states.length > 1) {
      const condition = us_states
        .map(state => `s.search_region = '${state}'`)
        .join(' OR ');
      conditions.push(`(${condition})`);
    } else {
      conditions.push(`s.search_region = '${us_states[0]}'`);
    }
  }

  // Filter by countries (using search_country_code field)
  if (countries && countries.length > 0) {
    if (countries.length > 1) {
      const condition = countries
        .map(country => `s.search_country_code = '${country}'`)
        .join(' OR ');
      conditions.push(`(${condition})`);
    } else {
      conditions.push(`s.search_country_code = '${countries[0]}'`);
    }
  }

  // Build year condition using timestamp ranges
  const buildYearCondition = (year) => {
    const parsedYear = parseInt(year);
    return `(to_timestamp(s.search_timestamp/1000) BETWEEN '${createTimestamp(parsedYear)}' AND '${createTimestamp(parsedYear + 1)}')`;
  };

  // Filter by year
  if (years && years.length > 0) {
    if (years.length > 1) {
      const condition = years
        .map(year => buildYearCondition(year))
        .join(' OR ');
      conditions.push(`(${condition})`);
    } else {
      conditions.push(buildYearCondition(years[0]));
    }
  }

  // Filter by date range
  if (start_date) {
    conditions.push(`to_timestamp(s.search_timestamp/1000) >= '${start_date} 00:00:00'::timestamp`);
  }

  if (end_date) {
    conditions.push(`to_timestamp(s.search_timestamp/1000) <= '${end_date} 23:59:59'::timestamp`);
  }

  return conditions.join(' AND ');
}

/**
 * Parse and validate filter parameters from request query.
 * Ported from server/api/queries.js getFilteredSearches parameter handling.
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

  // Handle search_locations
  let search_locations = [];
  if (getType(query.search_locations) === 'string') {
    search_locations = [query.search_locations];
  } else if (getType(query.search_locations) === 'array') {
    search_locations = query.search_locations;
  }

  // Handle cities parameter (legacy support) - maps to search_locations
  if (query.cities && !search_locations.length) {
    if (getType(query.cities) === 'string') {
      search_locations = [query.cities];
    } else if (getType(query.cities) === 'array') {
      search_locations = query.cities;
    }
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
