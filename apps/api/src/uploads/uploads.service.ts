import { randomUUID } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RequestUploadUrlInput, UploadUrlResult } from '@flashcard/contracts';
import { FLASHCARD_IMAGES_BUCKET, SupabaseAdminService } from '../supabase/supabase-admin.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

@Injectable()
export class UploadsService {
  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  /**
   * Path luon do server sinh (UUID + duoi theo contentType), khong nhan ten file tu
   * client - tranh path traversal. contentType da duoc Zod enum whitelist truoc khi
   * toi day (xem requestUploadUrlSchema trong @flashcard/contracts).
   */
  async createFlashcardImageUploadUrl(
    user: AuthenticatedUser,
    input: RequestUploadUrlInput,
  ): Promise<UploadUrlResult> {
    const extension = EXTENSION_BY_CONTENT_TYPE[input.contentType] ?? 'webp';
    const path = `${user.id}/${randomUUID()}.${extension}`;

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(FLASHCARD_IMAGES_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new InternalServerErrorException('Không tạo được đường dẫn tải ảnh lên.');
    }

    const { data: publicData } = this.supabaseAdmin.client.storage
      .from(FLASHCARD_IMAGES_BUCKET)
      .getPublicUrl(path);

    return {
      path: data.path,
      token: data.token,
      uploadUrl: data.signedUrl,
      publicUrl: publicData?.publicUrl,
    };
  }
}
