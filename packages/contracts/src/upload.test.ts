import { describe, expect, it } from 'vitest';
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  requestUploadUrlSchema,
  uploadUrlResultSchema,
} from './upload';

describe('upload contracts', () => {
  it('ALLOWED_IMAGE_CONTENT_TYPES chua du webp, jpeg, png', () => {
    expect(ALLOWED_IMAGE_CONTENT_TYPES).toEqual(['image/webp', 'image/jpeg', 'image/png']);
  });

  it('requestUploadUrlSchema chap nhan image/webp, image/jpeg, image/png', () => {
    expect(requestUploadUrlSchema.safeParse({ contentType: 'image/webp' }).success).toBe(true);
    expect(requestUploadUrlSchema.safeParse({ contentType: 'image/jpeg' }).success).toBe(true);
    expect(requestUploadUrlSchema.safeParse({ contentType: 'image/png' }).success).toBe(true);
  });

  it('requestUploadUrlSchema tu choi loai khong hop le', () => {
    expect(requestUploadUrlSchema.safeParse({ contentType: 'image/gif' }).success).toBe(false);
    expect(requestUploadUrlSchema.safeParse({ contentType: 'application/pdf' }).success).toBe(false);
    expect(requestUploadUrlSchema.safeParse({}).success).toBe(false);
  });

  it('uploadUrlResultSchema validate du lieu tra ve tu server', () => {
    const valid = {
      path: 'user-1/test.webp',
      token: 'jwt-token',
      uploadUrl: 'https://storage.supabase.co/signed',
      publicUrl: 'https://storage.supabase.co/public',
    };
    expect(uploadUrlResultSchema.safeParse(valid).success).toBe(true);
  });
});
