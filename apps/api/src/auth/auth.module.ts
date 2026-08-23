import { Global, Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

/**
 * Global vi SupabaseAuthGuard duoc dang ky lam APP_GUARD trong AppModule va can
 * SupabaseJwtService o moi noi.
 */
@Global()
@Module({
  providers: [SupabaseJwtService, SupabaseAuthGuard],
  exports: [SupabaseJwtService, SupabaseAuthGuard],
})
export class AuthModule {}
