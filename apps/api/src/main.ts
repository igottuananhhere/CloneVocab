import 'reflect-metadata';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.use(helmet());

  // Version ngay tu dau: khi P2/P3 doi hinh dang response, /api/v2 song song duoc
  // voi /api/v1 ma khong pha frontend dang chay.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const allowed = config.get<string[]>('allowedOrigins') ?? ['http://localhost:3000'];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Cho phep khong co origin (server-to-server, curl), cac origin trong config, hoac domain *.vercel.app va localhost
      if (
        !origin ||
        allowed.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} khong duoc phep boi CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`API san sang tai http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();
