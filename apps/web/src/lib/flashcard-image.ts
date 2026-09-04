const BUCKET = 'flashcard-images';

/**
 * Tra ve URL cong khai cua anh flashcard tu imagePath.
 * Neu da la URL day du (http/https/data), tra ve nguyen ban.
 * Neu rong hoac null, tra ve null.
 */
export function flashcardImageUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return null;
  }

  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${trimmed}`;
}
