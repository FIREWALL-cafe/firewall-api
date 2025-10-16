'use strict';

const axios = require('axios');
const { query } = require('./db');
const spaces = require('./spaces');

/**
 * Download image from URL and return buffer
 */
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000, // 8 second timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB max
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading image:', url, error.message);
    return null;
  }
}

/**
 * Process and save images for a search
 * Replaces worker.js logic with async/await
 */
async function processAndSaveImages(searchId, googleImages = [], baiduImages = []) {
  console.log(`[processAndSaveImages] Processing images for search ${searchId}`);
  console.log(`[processAndSaveImages] Google: ${googleImages.length}, Baidu: ${baiduImages.length}`);

  if (googleImages.length === 0 && baiduImages.length === 0) {
    console.log('[processAndSaveImages] No images to process');
    return { saved: 0, errors: 0 };
  }

  const results = {
    saved: 0,
    errors: 0
  };

  // Process Google images
  if (googleImages.length > 0) {
    const googleResults = await saveImages('google', searchId, googleImages);
    results.saved += googleResults.saved;
    results.errors += googleResults.errors;
  }

  // Process Baidu images
  if (baiduImages.length > 0) {
    const baiduResults = await saveImages('baidu', searchId, baiduImages);
    results.saved += baiduResults.saved;
    results.errors += baiduResults.errors;
  }

  console.log(`[processAndSaveImages] Complete: ${results.saved} saved, ${results.errors} errors`);
  return results;
}

/**
 * Save images for a specific search engine
 */
async function saveImages(engine, searchId, imageUrls) {
  console.log(`[saveImages] Saving ${imageUrls.length} ${engine} images for search ${searchId}`);

  const results = {
    saved: 0,
    errors: 0
  };

  // Process images in batches to avoid timeout
  const batchSize = 5;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => saveImage(engine, searchId, url));

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.saved++;
      } else {
        results.errors++;
      }
    });
  }

  return results;
}

/**
 * Download and save a single image
 */
async function saveImage(engine, searchId, originalUrl) {
  const timestamp = Date.now();

  try {
    // Download image
    const imageBuffer = await downloadImage(originalUrl);

    if (!imageBuffer) {
      // Save URL only if download failed
      await query(
        `INSERT INTO images (search_id, image_search_engine, image_href, image_timestamp) VALUES ($1, $2, $3, $4)`,
        [searchId, engine, originalUrl, timestamp]
      );
      return true;
    }

    // Upload to Digital Ocean Spaces
    const newUrl = await spaces.saveImage(imageBuffer, originalUrl);

    if (newUrl) {
      // Save with uploaded URL
      await query(
        `INSERT INTO images (search_id, image_search_engine, image_href, image_href_original, image_timestamp) VALUES ($1, $2, $3, $4, $5)`,
        [searchId, engine, newUrl, originalUrl, timestamp]
      );
    } else {
      // Save original URL if upload failed
      await query(
        `INSERT INTO images (search_id, image_search_engine, image_href, image_timestamp) VALUES ($1, $2, $3, $4)`,
        [searchId, engine, originalUrl, timestamp]
      );
    }

    return true;
  } catch (error) {
    console.error(`[saveImage] Error saving ${engine} image:`, error.message);

    // Try to save URL at least
    try {
      await query(
        `INSERT INTO images (search_id, image_search_engine, image_href, image_timestamp) VALUES ($1, $2, $3, $4)`,
        [searchId, engine, originalUrl, timestamp]
      );
    } catch (dbError) {
      console.error(`[saveImage] Failed to save image URL:`, dbError.message);
    }

    return false;
  }
}

module.exports = {
  processAndSaveImages,
  saveImages,
  saveImage,
  downloadImage
};
