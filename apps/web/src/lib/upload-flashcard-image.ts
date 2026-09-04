import { createClient } from '@/lib/supabase/client';
import { apiBrowser } from '@/lib/api/browser';
import type { UploadUrlResult } from '@flashcard/contracts';
import { compressImageToWebp } from './compress-image';

const BUCKET = 'flashcard-images';

/**
 * Nen anh -> xin signed URL tu API NestJS -> upload thang len Supabase Storage.
 * Tra ve `imagePath` de luu vao the flashcard.
 */
export async function uploadFlashcardImage(file: File): Promise<string> {
  const compressed = await compressImageToWebp(file);

  const { path, token, uploadUrl } = await apiBrowser<UploadUrlResult>(
    '/uploads/flashcard-image',
    {
      method: 'POST',
      body: { contentType: 'image/webp' },
    },
  );

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, compressed, { contentType: 'image/webp' });

  if (error) {
    if (uploadUrl) {
      try {
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/webp' },
          body: compressed,
        });
        if (response.ok) {
          return path;
        }
      } catch {
        // Tiep tuc bao loi
      }
    }
    throw new Error(`Tải ảnh lên không thành công: ${error.message}`);
  }

  return path;
}
