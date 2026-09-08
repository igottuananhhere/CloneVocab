import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

/**
 * Global vi SupabaseAuthGuard duoc dang ky lam APP_GUARD trong AppModule va can
 * SupabaseJwtService o moi noi.
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtService, SupabaseAuthGuard],
  exports: [AuthService, SupabaseJwtService, SupabaseAuthGuard],
})
export class AuthModule {}

