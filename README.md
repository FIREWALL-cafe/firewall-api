# Firewall Cafe API - Vercel Serverless Functions

Serverless API for the Firewall Cafe project, providing search, analytics, voting, and image management endpoints.

**Production:** https://firewall-api.vercel.app
**GitHub:** https://github.com/FIREWALL-cafe/firewall-api

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
The project uses `dotenv-flow` for environment-specific configuration. Create the appropriate `.env` files:

```bash
# .env.local (local overrides, gitignored)
POSTGRES_URL=postgresql://user:pass@host:5432/firewall
POSTGRES_URL_NON_POOLING=postgresql://user:pass@host:5432/firewall
API_SECRET=your_secret_key_here
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
DO_SPACES_KEY=your_do_key
DO_SPACES_SECRET=your_do_secret
DO_SPACES_BUCKET=your_bucket_name
```

**Environment file loading order:**
1. `.env` (default, committed)
2. `.env.local` (local overrides, gitignored)
3. `.env.development` (dev-specific)
4. `.env.development.local` (dev local overrides)

### 3. Local Development
```bash
npm run dev
```

This starts the local development server at `http://localhost:3001`

### 4. Test the API
```bash
# Health check
curl http://localhost:3001/api/health

# Basic info
curl http://localhost:3001/api

# Dashboard data
curl http://localhost:3001/api/dashboard

# Searches (paginated)
curl "http://localhost:3001/api/searches?page=1&page_size=10"

# Search locations
curl http://localhost:3001/api/searches/search-locations
```

## Deployment

The API is deployed on Vercel and connected to the GitHub repository. Pushes to `main` automatically deploy to production.

### Manual Deployment
```bash
vercel --prod
```

### Environment Variables in Vercel
Set these in the Vercel dashboard (Settings → Environment Variables):
- `POSTGRES_URL` - Vercel Postgres connection URL (pooling)
- `POSTGRES_URL_NON_POOLING` - Direct connection URL
- `API_SECRET` - Secret key for authenticated endpoints
- `DO_SPACES_ENDPOINT` - Digital Ocean Spaces endpoint
- `DO_SPACES_KEY` - Digital Ocean Spaces access key
- `DO_SPACES_SECRET` - Digital Ocean Spaces secret key
- `DO_SPACES_BUCKET` - Bucket name for image storage

## API Endpoints

### Core
- `GET /api` - Basic API information and status
- `GET /api/health` - Health check with database connectivity test
- `GET /api/dashboard` - Dashboard statistics and overview

### Searches
- `GET /api/searches?page=1&page_size=10` - Get all searches (paginated)
- `GET /api/searches/search-locations` - Get list of search locations with counts
- `GET /api/searches/filter` - Filter searches by various criteria
- `POST /api/create-search` or `/api/createSearch` - Create new search (requires API_SECRET)
- `POST /api/delete-search` or `/api/deleteSearch` - Delete search (requires API_SECRET)

### Analytics
- `GET /api/analytics/geographic` - Geographic distribution of searches
- `GET /api/analytics/us-states` - US state-level analytics
- `GET /api/analytics/countries` - Country-level analytics
- `GET /api/analytics/search-analytics` - Search trends and patterns
- `GET /api/analytics/vote-analytics` - Voting statistics
- `GET /api/analytics/recent-activity` - Recent search and vote activity

### Images
- `GET /api/images` - Get all images (paginated)
- `GET /api/images/by-search-id?search_id=123` - Get images for specific search
- `POST /api/process-images` - Process and download images (requires API_SECRET)
- `POST /api/delete-image` or `/api/deleteImage` - Delete image (requires API_SECRET)
- `PUT /api/update-image` or `/api/updateImage` - Update image metadata (requires API_SECRET)

### Votes
- `GET /api/votes` - Get all votes (paginated)
- `GET /api/votes/by-search-id?search_id=123` - Get votes for specific search
- `GET /api/votes/by-vote-id?vote_id=1` - Get votes by vote category
- `POST /api/vote` or `/api/create-vote` - Create new vote (requires API_SECRET)

## Deployment Status

### ✅ Production Ready
- [x] All read endpoints fully functional
- [x] All write endpoints implemented
- [x] Authentication via API_SECRET
- [x] CORS properly configured
- [x] Database connection pooling optimized
- [x] Image processing with Digital Ocean Spaces
- [x] Geographic analytics with IP geolocation
- [x] Pagination support across all list endpoints
- [x] Comprehensive filtering system
- [x] Deployed to Vercel at https://firewall-api.vercel.app
- [x] Connected to GitHub repository for auto-deployment
- [x] Environment-specific configuration with dotenv-flow

## Architecture

### Serverless Functions
Each API endpoint is a separate serverless function in the `/api` directory, optimized for Vercel's edge network.

### Database
- **Vercel Postgres** with connection pooling for serverless environments
- Optimized queries with proper indexing
- Separate pooling and non-pooling connection URLs

### Storage
- **Digital Ocean Spaces** for image storage
- Asynchronous image processing to avoid function timeouts
- CDN-enabled delivery for optimal performance

### Authentication
Protected endpoints require `API_SECRET` header for write operations.

## Development Notes

- Local server runs on port **3001** (not 3000)
- Uses `dotenv-flow` for environment-specific configuration
- Each serverless function has a 10-second timeout (configurable on Pro plan)
- CORS handled via middleware wrapper functions
- Image processing is asynchronous to handle large batches

## Troubleshooting

### Database Connection Issues
1. Verify `POSTGRES_URL` environment variable is set
2. Check that database accepts connections from Vercel IPs
3. Ensure SSL is properly configured
4. Test with `npm start` to run database connection test

### Local Development Issues
1. Make sure port 3001 is not in use
2. Verify `.env.local` file exists with all required variables
3. Check that `node_modules` is installed (`npm install`)
4. Restart dev server after environment variable changes

### CORS Issues
1. Check `vercel.json` headers configuration
2. Verify middleware is applied via `allowCors()` wrapper
3. Test with different origins and request methods
4. Check browser console for specific CORS errors

## Project Structure

```
firewall-api/
├── api/                    # Serverless functions
│   ├── analytics/          # Analytics endpoints
│   ├── images/             # Image management
│   ├── searches/           # Search endpoints
│   ├── votes/              # Voting endpoints
│   ├── create-search.js    # Create search
│   ├── create-vote.js      # Create vote
│   ├── dashboard/          # Dashboard data
│   └── ...
├── lib/                    # Shared utilities
│   ├── db.js              # Database connection
│   ├── cors.js            # CORS middleware
│   ├── auth.js            # Authentication
│   ├── pagination.js      # Pagination helper
│   ├── filter-builder.js  # Query builder
│   └── ...
├── scripts/               # Migration and utility scripts
├── local-server.js        # Local development server
└── vercel.json           # Vercel configuration
```