import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateReportInput, ReportSummary } from '@flashcard/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    studySetId: string,
    input: CreateReportInput,
    user?: AuthenticatedUser,
  ): Promise<ReportSummary> {
    const studySet = await this.prisma.client.studySet.findUnique({
      where: { id: studySetId },
      select: { id: true },
    });

    if (!studySet) {
      throw new NotFoundException('Không tìm thấy bộ thẻ để báo cáo.');
    }

    const report = await this.prisma.client.contentReport.create({
      data: {
        studySetId,
        reporterId: user?.id ?? null,
        reason: input.reason,
        note: input.note?.trim() || null,
      },
      select: {
        id: true,
        studySetId: true,
        reporterId: true,
        reason: true,
        note: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...report,
      createdAt: report.createdAt.toISOString(),
    };
  }
}
