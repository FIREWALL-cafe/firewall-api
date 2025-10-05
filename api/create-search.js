// Create Search endpoint - Combined version with geolocation support
// Migrated from queries.js createSearch and saveSearchAndImages
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { query } = require('../lib/db');
const ipGeolocation = require('../lib/ipGeolocation');

async function handler(req, res) {
  try {
    const {
      // Standard fields from createSearch
      search_timestamp,
      search_location,
      search_ip_address,
      search_client_name,
      search_engine_initial,
      search_engine_translation,
      search_term_initial,
      search_term_initial_language_code,
      search_term_initial_language_confidence,
      search_term_initial_language_alternate_code,
      search_term_translation,
      search_term_translation_language_code,
      search_term_status_banned,
      search_term_status_sensitive,

      // Alternative naming from saveSearchAndImages
      timestamp,
      location,
      search_engine,
      search,
      translation,
      lang_from,
      banned,
      sensitive,
    } = req.body;

    // Support both naming conventions
    const finalTimestamp = search_timestamp || timestamp;
    const finalLocation = search_location || location;
    const finalEngineInitial = search_engine_initial || search_engine;
    const finalEngineTranslation = search_engine_translation || (search_engine === 'google' ? 'baidu' : 'google');
    const finalTermInitial = search_term_initial || search;
    const finalTermTranslation = search_term_translation || translation;
    const finalTermLangCode = search_term_initial_language_code || lang_from;
    const finalTermBanned = search_term_status_banned !== undefined ? search_term_status_banned : (banned || false);
    const finalTermSensitive = search_term_status_sensitive !== undefined ? search_term_status_sensitive : (sensitive || false);

    // Validate
    if (!finalTermInitial || !finalTimestamp) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: { search: !finalTermInitial, timestamp: !finalTimestamp }
      });
    }

    // Get geolocation if IP provided
    let geoData = null;
    if (search_ip_address) {
      try {
        geoData = await ipGeolocation.getLocation(search_ip_address);
      } catch (error) {
        console.log('Geolocation failed, continuing without it');
      }
    }

    const insertQuery = `INSERT INTO searches (
      search_id, search_timestamp, search_location, search_ip_address, search_client_name,
      search_country, search_country_code, search_region, search_city,
      search_latitude, search_longitude,
      search_engine_initial, search_engine_translation,
      search_term_initial, search_term_initial_language_code,
      search_term_initial_language_confidence, search_term_initial_language_alternate_code,
      search_term_translation, search_term_translation_language_code,
      search_term_status_banned, search_term_status_sensitive
    ) VALUES (
      DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) RETURNING search_id`;

    const values = [
      finalTimestamp, finalLocation, search_ip_address, search_client_name,
      geoData?.country || null, geoData?.countryCode || null,
      geoData?.region || null, geoData?.city || null,
      geoData?.latitude || null, geoData?.longitude || null,
      finalEngineInitial, finalEngineTranslation,
      finalTermInitial, finalTermLangCode,
      search_term_initial_language_confidence, search_term_initial_language_alternate_code,
      finalTermTranslation, search_term_translation_language_code,
      finalTermBanned, finalTermSensitive
    ];

    const results = await query(insertQuery, values);
    const searchId = results.rows[0].search_id;

    res.status(201).json({ searchId });

  } catch (error) {
    console.error('Create search endpoint error:', error);
    res.status(500).json({
      error: 'Failed to create search',
      message: error.message
    });
  }
}

// Apply authentication and CORS
module.exports = allowCors(checkSecret(handler));
