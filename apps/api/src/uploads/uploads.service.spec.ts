import { describe, expect, it } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import type { SupabaseAdminService } from '../supabase/supabase-admin.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const user: AuthenticatedUser = { id: 'user-1', email: 'a@example.com', role: 'authenticated' };

function makeService(
  createSignedUploadUrl: (path: string) => Promise<unknown>,
  getPublicUrl?: (path: string) => { data: { publicUrl: string } },
): UploadsService {
  const supabaseAdmin = {
    client: {
      storage: {
        from: () => ({
          createSignedUploadUrl,
          getPublicUrl: getPublicUrl ?? ((path: string) => ({ data: { publicUrl: `https://mock.supabase.co/${path}` } })),
        }),
      },
    },
  } as unknown as SupabaseAdminService;

  return new UploadsService(supabaseAdmin);
}

describe('UploadsService.createFlashcardImageUploadUrl', () => {
  it('duong dan sinh ra bat dau bang userId va dung phan mo rong theo contentType', async () => {
    let capturedPath = '';
    const service = makeService(async (path) => {
      capturedPath = path;
      return { data: { path, token: 'token-gia', signedUrl: `https://upload.co/${path}` }, error: null };
    });

    const result = await service.createFlashcardImageUploadUrl(user, {
      contentType: 'image/webp',
    });

    expect(capturedPath).toMatch(/^user-1\/[0-9a-f-]+\.webp$/);
    expect(result).toEqual({
      path: capturedPath,
      token: 'token-gia',
      uploadUrl: `https://upload.co/${capturedPath}`,
      publicUrl: `https://mock.supabase.co/${capturedPath}`,
    });
  });

  it('anh jpeg ra duoi .jpg, khong phai .jpeg', async () => {
    let capturedPath = '';
    const service = makeService(async (path) => {
      capturedPath = path;
      return { data: { path, token: 'token-t', signedUrl: `https://upload.co/${path}` }, error: null };
    });

    await service.createFlashcardImageUploadUrl(user, { contentType: 'image/jpeg' });

    expect(capturedPath).toMatch(/\.jpg$/);
  });

  it('anh png ra duoi .png', async () => {
    let capturedPath = '';
    const service = makeService(async (path) => {
      capturedPath = path;
      return { data: { path, token: 'token-p', signedUrl: `https://upload.co/${path}` }, error: null };
    });

    await service.createFlashcardImageUploadUrl(user, { contentType: 'image/png' });

    expect(capturedPath).toMatch(/\.png$/);
  });

  it('nem loi 500 khi Supabase Storage tra ve error', async () => {
    const service = makeService(async () => ({ data: null, error: new Error('storage error') }));

    await expect(
      service.createFlashcardImageUploadUrl(user, { contentType: 'image/png' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
