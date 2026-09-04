import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const FLASHCARD_IMAGES_BUCKET = 'flashcard-images';

@Injectable()
export class SupabaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseAdminService.name);
  public readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async onModuleInit() {
    try {
      const { data: buckets, error } = await this.client.storage.listBuckets();
      if (error) {
        this.logger.warn(`Không thể kiểm tra bucket storage: ${error.message}`);
        return;
      }
      const exists = buckets?.some((b) => b.name === FLASHCARD_IMAGES_BUCKET);
      if (!exists) {
        this.logger.log(`Đang tạo bucket ${FLASHCARD_IMAGES_BUCKET}...`);
        const { error: createError } = await this.client.storage.createBucket(
          FLASHCARD_IMAGES_BUCKET,
          {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024,
            allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
          },
        );
        if (createError) {
          this.logger.warn(`Không thể tự tạo bucket: ${createError.message}`);
        } else {
          this.logger.log(`Đã tạo thành công bucket ${FLASHCARD_IMAGES_BUCKET} (public)`);
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`Lỗi khởi tạo bucket: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
