import { adminApi } from './api';

// Mirrors ALLOWED_FOLDERS on the backend's /uploads/presign route.
export type UploadFolder = 'avatars' | 'service-photos' | 'documents' | 'tenders' | 'chat' | 'support';

/**
 * Uploads a File to R2 via a presigned URL and returns the public URL to store.
 *
 * When R2 isn't configured the backend answers with mock:true and no upload
 * URL; we skip the PUT and return the placeholder so the flow still completes.
 * The mock adapter does the same, so this works in both modes.
 */
export async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
  const contentType = file.type || 'application/octet-stream';
  const presign = await adminApi.uploads.presign(folder, file.name, contentType);

  if (presign.mock || !presign.uploadUrl) return presign.publicUrl;

  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!put.ok) throw new Error('Upload failed');
  return presign.publicUrl;
}
