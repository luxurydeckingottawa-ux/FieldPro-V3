/**
 * Lightweight wrapper around the /.netlify/functions/upload endpoint.
 *
 * Used by PhotoUploadSection to push each field photo to Cloudinary as soon as
 * it's captured — rather than waiting for final submission. This is what lets
 * the customer-portal BuildTracker reflect live progress: the mid-workflow
 * auto-save in App.tsx strips any photo URL that isn't already a cloud URL
 * (to stay under Postgres row limits), so without immediate upload, photos
 * never persist to Supabase until the crew hits "Submit" at the very end.
 */

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;

export async function uploadPhotoToCloudinary(
  dataUri: string,
  filename: string,
  folder?: string,
): Promise<string> {
  const response = await fetch('/.netlify/functions/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(INTERNAL_SECRET ? { 'X-Internal-Secret': INTERNAL_SECRET } : {}),
    },
    body: JSON.stringify({
      file: dataUri,
      filename,
      folder: folder ? `luxury_decking/${folder}` : 'luxury_decking',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Photo upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.url) throw new Error('Photo upload succeeded but returned no URL');
  return data.url as string;
}
