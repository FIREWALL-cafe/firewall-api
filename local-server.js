// Simple local server to test Vercel functions
require('dotenv-flow').config();

const http = require('http');
const url = require('url');

// Import the handlers
const indexHandler = require('./api/index');
const healthHandler = require('./api/health');
const dashboardHandler = require('./api/dashboard/index');
const searchesHandler = require('./api/searches/index');

const geographicAnalyticsHandler = require('./api/analytics/geographic');
const usStatesAnalyticsHandler = require('./api/analytics/us-states');
const countriesHandler = require('./api/analytics/countries');
const searchAnalyticsHandler = require('./api/analytics/search-analytics');
const voteAnalyticsHandler = require('./api/analytics/vote-analytics');
const recentActivityHandler = require('./api/analytics/recent-activity');

const searchLocationsHandler = require('./api/searches/search-locations');

const allVotesHandler = require('./api/votes/index');
const votesBySearchIdHandler = require('./api/votes/by-search-id');
const votesByVoteIdHandler = require('./api/votes/by-vote-id');

const allImagesHandler = require('./api/images/index');
const imagesBySearchIdHandler = require('./api/images/by-search-id');

const createSearchHandler = require('./api/create-search');
const createVoteHandler = require('./api/create-vote');
const deleteSearchHandler = require('./api/delete-search');
const deleteImageHandler = require('./api/delete-image');
const updateImageHandler = require('./api/update-image');
const processImagesHandler = require('./api/process-images');

// Filter handler
const filterSearchesHandler = require('./api/searches/filter');

const PORT = 3001;

// Helper to convert Node.js req/res to Vercel-style
async function handleRequest(req, res, handler) {
  const parsedUrl = url.parse(req.url, true);

  req.query = parsedUrl.query || {};
  req.method = req.method;

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body);
      } catch (e) {
        req.body = {};
      }
      await handler(req, res);
    });
  } else {
    await handler(req, res);
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`[${req.method}] ${pathname}`);

  // Add json helper
  res.json = (data) => {
    res.statusCode = res.statusCode || 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  // Route to appropriate handler
  try {
    switch (pathname) {
      case '/api':
        await handleRequest(req, res, indexHandler);
        break;
      case '/api/health':
        await handleRequest(req, res, healthHandler);
        break;
      case '/api/dashboard':
        await handleRequest(req, res, dashboardHandler);
        break;
      case '/api/searches':
        await handleRequest(req, res, searchesHandler);
        break;
      case '/api/searches/search-locations':
        await handleRequest(req, res, searchLocationsHandler);
        break;
      case '/api/analytics/geographic':
        await handleRequest(req, res, geographicAnalyticsHandler);
        break;
      case '/api/analytics/us-states':
        await handleRequest(req, res, usStatesAnalyticsHandler);
        break;
      case '/api/analytics/countries':
        await handleRequest(req, res, countriesHandler);
        break;
      case '/api/analytics/search-analytics':
        await handleRequest(req, res, searchAnalyticsHandler);
        break;
      case '/api/analytics/vote-analytics':
        await handleRequest(req, res, voteAnalyticsHandler);
        break;
      case '/api/analytics/recent-activity':
        await handleRequest(req, res, recentActivityHandler);
        break;
      case '/api/votes':
        await handleRequest(req, res, allVotesHandler);
        break;
      case '/api/votes/by-search-id':
        await handleRequest(req, res, votesBySearchIdHandler);
        break;
      case '/api/votes/by-vote-id':
        await handleRequest(req, res, votesByVoteIdHandler);
        break;
      case '/api/images':
        await handleRequest(req, res, allImagesHandler);
        break;
      case '/api/images/by-search-id':
        await handleRequest(req, res, imagesBySearchIdHandler);
        break;
      case '/api/create-search':
        await handleRequest(req, res, createSearchHandler);
        break;
      case '/api/vote':
        await handleRequest(req, res, createVoteHandler);
        break;
      case '/api/delete-search':
        await handleRequest(req, res, deleteSearchHandler);
        break;
      case '/api/delete-image':
        await handleRequest(req, res, deleteImageHandler);
        break;
      case '/api/update-image':
        await handleRequest(req, res, updateImageHandler);
        break;
      case '/api/process-images':
        await handleRequest(req, res, processImagesHandler);
        break;
      case '/api/searches/filter':
        await handleRequest(req, res, filterSearchesHandler);
        break;
      default:
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
  console.log('\n📊 Core:');
  console.log('  GET  /api');
  console.log('  GET  /api/health');
  console.log('  GET  /api/dashboard');
  console.log('\n🔍 Searches:');
  console.log('  GET  /api/searches');
  console.log('  GET  /api/searches/search-locations');
  console.log('  GET  /api/searches/filter');
  console.log('\n📈 Analytics:');
  console.log('  GET  /api/analytics/geographic');
  console.log('  GET  /api/analytics/us-states');
  console.log('  GET  /api/analytics/countries');
  console.log('  GET  /api/analytics/search-analytics');
  console.log('  GET  /api/analytics/vote-analytics');
  console.log('  GET  /api/analytics/recent-activity');
  console.log('\n🗳️  Votes:');
  console.log('  GET  /api/votes');
  console.log('  GET  /api/votes/by-search-id?search_id=1');
  console.log('  GET  /api/votes/by-vote-id?vote_id=1');
  console.log('  POST /api/vote (requires secret)');
  console.log('\n🖼️  Images:');
  console.log('  GET  /api/images');
  console.log('  GET  /api/images/by-search-id?search_id=1');
  console.log('  POST /api/process-images (requires secret)');
  console.log('  POST /api/delete-image (requires secret)');
  console.log('  PUT  /api/update-image (requires secret)');
  console.log('\n✏️  Write Operations (require secret):');
  console.log('  POST /api/create-search');
  console.log('  POST /api/delete-search');
  console.log('\n💡 Two-step image workflow:');
  console.log('  1. POST /api/create-search → returns {searchId}');
  console.log('  2. POST /api/process-images → processes 18 images');
});