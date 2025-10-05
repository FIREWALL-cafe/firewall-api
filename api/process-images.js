// Process Images endpoint - Part 2 of 2 for saveSearchAndImages
// This endpoint processes and saves images for a search ID
// Handles 18 images (9 Google + 9 Baidu) with batching to avoid timeout
const { checkSecret } = require('../lib/auth');
const { allowCors } = require('../lib/cors');
const { processAndSaveImages } = require('../lib/image-processor');

async function handler(req, res) {
  try {
    console.log('[processImages] Request received');

    const {
      searchId,
      search_id,  // Support both naming conventions
      google_images = [],
      baidu_images = [],
    } = req.body;

    const finalSearchId = searchId || search_id;

    // Validate
    if (!finalSearchId) {
      return res.status(400).json({
        error: 'Missing searchId',
        message: 'searchId or search_id is required'
      });
    }

    if (google_images.length === 0 && baidu_images.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'At least one of google_images or baidu_images must be provided'
      });
    }

    console.log(`[processImages] Processing images for search ${finalSearchId}`);
    console.log(`[processImages] Google: ${google_images.length}, Baidu: ${baidu_images.length}`);

    // Process images (batched internally to handle 18 images safely)
    const results = await processAndSaveImages(finalSearchId, google_images, baidu_images);

    console.log(`[processImages] Complete: ${results.saved} saved, ${results.errors} errors`);

    res.status(200).json({
      searchId: finalSearchId,
      images: {
        total: google_images.length + baidu_images.length,
        saved: results.saved,
        errors: results.errors
      },
      message: 'Image processing complete'
    });

  } catch (error) {
    console.error('[processImages] Error:', error);
    res.status(500).json({
      error: 'Failed to process images',
      message: error.message
    });
  }
}

// Apply authentication and CORS
module.exports = allowCors(checkSecret(handler));
