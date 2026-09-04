const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 0.85;

/**
 * Resize anh ve toi da 1200px canh dai va nen sang WebP ngay tren trinh duyet truoc
 * khi upload - giam dung luong Storage va tang toc do tai trang.
 */
export async function compressImageToWebp(file: File): Promise<Blob> {
  // Neu moi truong khong co window hoac createImageBitmap (nhu test jsdom), tra ve nguyen ban file
  if (typeof window === 'undefined' || typeof createImageBitmap === 'undefined') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        'image/webp',
        WEBP_QUALITY,
      );
    });
  } catch {
    // Fallback neu canvas loi: tra ve truc tiep file goc
    return file;
  }
}
