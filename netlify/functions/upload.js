const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Shared secret guard. TODO: replace with Supabase JWT verification once auth is fully integrated.
function checkInternalSecret(event) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return true; // not configured — allow (dev/staging without the env var set)
  const provided = event.headers['x-internal-secret'] || event.headers['X-Internal-Secret'];
  return provided === secret;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!checkInternalSecret(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Enforce body size limit (Netlify's max is 6MB; reject early with clear error)
  const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
  if (event.body && Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: 'File too large. Maximum upload size is 5 MB.' }) };
  }

  // Allowed MIME type prefixes (images, PDFs, plain text)
  const ALLOWED_PREFIXES = ['data:image/', 'data:application/pdf', 'data:text/plain'];

  try {
    const { file, folder, filename } = JSON.parse(event.body);

    if (!file || !ALLOWED_PREFIXES.some(p => file.startsWith(p))) {
      return { statusCode: 400, body: JSON.stringify({ error: 'File type not allowed. Accepted: images, PDF, plain text.' }) };
    }

    // Derive resource_type from MIME rather than using 'auto' (prevents executable uploads)
    const resourceType = file.startsWith('data:image/') ? 'image' : 'raw';

    const result = await cloudinary.uploader.upload(file, {
      folder: folder || 'fieldpro',
      public_id: filename,
      resource_type: resourceType,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: result.secure_url }),
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload file to Cloudinary' }),
    };
  }
};