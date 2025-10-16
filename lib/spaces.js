const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Use environment variables for configuration
const region = process.env.DIGITAL_OCEAN_SPACES_REGION || 'nyc3';

const s3 = new S3Client({
    region: region,
    endpoint: `https://${region}.digitaloceanspaces.com`,
    credentials: {
        accessKeyId: process.env.DIGITAL_OCEAN_SPACES_KEY,
        secretAccessKey: process.env.DIGITAL_OCEAN_SPACES_SECRET
    }
});

const filenameFromUrl = (url) => {
    const charset = '.`\'"()[]{}\\;&%@,-=+$:/<>~ ?';
    let fname = '';
    if(url.indexOf('://') >= 0) url = url.split('://')[1];
    if(url.slice(url.length-4, url.length) === '.jpg') url = url.slice(0, url.length-4);

    [...url].forEach(char => {
        fname += charset.indexOf(char) < 0 ? char : '_';
    })
    return fname;
}

const getFilenameFromUrl= (url) => {
  const pathname = new URL(url).pathname;
  return pathname.substring(pathname.lastIndexOf('/') + 1);
}

const getHashFromUrl = (url) => {
    return crypto.createHash('md5').update(url).digest('hex');
}

const saveImage = async (binary_data, url, retryCount = 0) => {
    const maxRetries = 1;

    const bucket = process.env.DIGITAL_OCEAN_SPACES_BUCKET;
    const key = 'images/' + getHashFromUrl(url);

    // Setting up S3 upload parameters
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: binary_data,
        ACL: "public-read",
        ContentType: 'image/jpeg'
    });

    try {
        // Uploading files to the bucket
        await s3.send(command);

        // Construct the public URL
        const location = `https://${bucket}.${region}.digitaloceanspaces.com/${key}`;
        console.log('[spaces] Successfully uploaded:', location);

        return location;
    } catch (err) {
        console.error('[spaces] Upload failed for URL:', url);
        console.error('[spaces] Error:', err.message);
        console.error('[spaces] Error code:', err.code);

        // Retry once if this was the first attempt
        if (retryCount < maxRetries) {
            console.log(`[spaces] Retrying upload (attempt ${retryCount + 2}/${maxRetries + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return saveImage(binary_data, url, retryCount + 1);
        }

        console.error('[spaces] Upload failed after retries. Error details:', err);
        return null;
    }
}

module.exports = {
    saveImage
}