import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.schema';
import { AuthModule } from './auth/auth.module';
import { SupabaseAuthGuard } from './auth/supabase-auth.guard';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { StudySetsModule } from './study-sets/study-sets.module';
import { StudyModule } from './study/study.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Bien moi truong nam o .env goc monorepo, dung chung voi Prisma va apps/web.
      envFilePath: ['../../.env'],
      validate: validateEnv,
      cache: true,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    ProfilesModule,
    StudySetsModule,
    StudyModule,
  ],
  providers: [
    // Dang ky toan cuc: mac dinh dong, mo tung route bang @Public.
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
  ],
})
export class AppModule {}
