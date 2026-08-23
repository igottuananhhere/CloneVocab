import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Netlify/Railway va script CI dung endpoint nay de biet API da san sang chua. */
  @Public()
  @Get()
  async check(): Promise<{ status: string; database: string; uptimeSeconds: number }> {
    let database = 'up';

    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
