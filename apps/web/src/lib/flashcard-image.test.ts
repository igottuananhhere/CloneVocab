import { describe, expect, it } from 'vitest';
import { flashcardImageUrl } from './flashcard-image';

describe('flashcardImageUrl', () => {
  it('tra ve null khi truyen null, undefined hoac chuoi rong', () => {
    expect(flashcardImageUrl(null)).toBeNull();
    expect(flashcardImageUrl(undefined)).toBeNull();
    expect(flashcardImageUrl('')).toBeNull();
    expect(flashcardImageUrl('   ')).toBeNull();
  });

  it('tra ve nguyen ban URL day du neu bat dau bang http/https/data', () => {
    expect(flashcardImageUrl('https://example.com/img.png')).toBe('https://example.com/img.png');
    expect(flashcardImageUrl('http://example.com/img.jpg')).toBe('http://example.com/img.jpg');
    expect(flashcardImageUrl('data:image/png;base64,...')).toBe('data:image/png;base64,...');
  });

  it('ghep public URL Supabase Storage khi nhan duong dan tuong doi', () => {
    const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcxyz.supabase.co';

    try {
      const url = flashcardImageUrl('user-1/card-1.webp');
      expect(url).toBe('https://abcxyz.supabase.co/storage/v1/object/public/flashcard-images/user-1/card-1.webp');
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
    }
  });
});
