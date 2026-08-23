import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@flashcard/db';
import type { PrismaClient } from '@flashcard/db';

/**
 * Boc PrismaClient dung chung thanh mot provider cua Nest de cac service inject duoc,
 * dong thoi gan vong doi ket noi vao vong doi cua ung dung.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  readonly client: PrismaClient = prisma;

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Da ket noi Postgres');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
