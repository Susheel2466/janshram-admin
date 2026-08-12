import { adminApi } from './api';

// Mirrors ALLOWED_FOLDERS on the backend's /uploads/sign route.
export type UploadFolder = 'avatars' | 'service-photos' | 'documents' | 'tenders' | 'chat' | 'support';

interface CloudinaryResponse {
  secure_url?: string;
  url?: string;
  error?: { message?: string };
}

/**
 * Uploads a File straight to Cloudinary and returns the URL to store.
 *
 * The backend only signs the request, so the api_secret stays server-side and
 * the file never passes through it. Unlike a presigned PUT the final URL isn't
 * known up front — Cloudinary returns it as `secure_url`.
 *
 * Without Cloudinary credentials the backend answers `mock: true` and we return
 * the placeholder. The mock adapter does the same, so this works in both modes.
 */
export async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
  const contentType = file.type || 'application/octet-stream';
  const sig = await adminApi.uploads.sign(folder, file.name, contentType);

  if (sig.mock || !sig.uploadUrl) {
    if (!sig.publicUrl) throw new Error('Uploads are not configured on the server');
    return sig.publicUrl;
  }

  const form = new FormData();
  for (const [k, v] of Object.entries(sig.params)) form.append(k, v);
  form.append('file', file);

  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  const body: CloudinaryResponse = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(body.error?.message || 'Upload failed');

  const url = body.secure_url ?? body.url;
  if (!url) throw new Error('Upload succeeded but no URL was returned');
  return url;
}
