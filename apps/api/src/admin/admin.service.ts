import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminOverviewStats,
  AdminReportItem,
  AdminReportListResponse,
  AdminReportQuery,
  ResolveReportInput,
} from '@flashcard/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminOverviewStats> {
    const [
      totalUsers,
      totalStudySets,
      totalFlashcards,
      testResultsCount,
      matchResultsCount,
      pendingReportsCount,
      recentUsersRaw,
      recentSetsRaw,
    ] = await Promise.all([
      this.prisma.client.profile.count(),
      this.prisma.client.studySet.count(),
      this.prisma.client.flashcard.count(),
      this.prisma.client.testResult.count(),
      this.prisma.client.matchResult.count(),
      this.prisma.client.contentReport.count({ where: { status: 'OPEN' } }),
      this.prisma.client.profile.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.client.studySet.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          cardCount: true,
          visibility: true,
          createdAt: true,
          owner: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalStudySets,
      totalFlashcards,
      totalStudySessions: testResultsCount + matchResultsCount,
      pendingReportsCount,
      recentUsers: recentUsersRaw.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      })),
      recentSets: recentSetsRaw.map((s) => ({
        id: s.id,
        title: s.title,
        ownerUsername: s.owner.username,
        cardCount: s.cardCount,
        visibility: s.visibility,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async getReports(query: AdminReportQuery): Promise<AdminReportListResponse> {
    const where = query.status ? { status: query.status } : {};
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, itemsRaw] = await Promise.all([
      this.prisma.client.contentReport.count({ where }),
      this.prisma.client.contentReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          studySet: {
            select: {
              id: true,
              title: true,
              owner: {
                select: {
                  username: true,
                },
              },
            },
          },
          reporter: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);

    const items: AdminReportItem[] = itemsRaw.map((item) => ({
      id: item.id,
      studySetId: item.studySetId,
      studySetTitle: item.studySet.title,
      studySetOwnerUsername: item.studySet.owner.username,
      reporterUsername: item.reporter?.username ?? null,
      reason: item.reason,
      note: item.note,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      resolvedAt: item.resolvedAt ? item.resolvedAt.toISOString() : null,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async resolveReport(id: string, input: ResolveReportInput): Promise<AdminReportItem> {
    const report = await this.prisma.client.contentReport.findUnique({
      where: { id },
      include: {
        studySet: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                username: true,
              },
            },
          },
        },
        reporter: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo vi phạm.');
    }

    const resolvedAt =
      input.status === 'RESOLVED' || input.status === 'DISMISSED' ? new Date() : null;

    if (input.action === 'MAKE_PRIVATE') {
      await this.prisma.client.studySet.update({
        where: { id: report.studySetId },
        data: { visibility: 'PRIVATE' },
      });
    }

    if (input.action === 'DELETE_SET') {
      // Snapshot item response truoc khi xoa bo the vi delete set se cascade xoa luon report
      const snapshot: AdminReportItem = {
        id: report.id,
        studySetId: report.studySetId,
        studySetTitle: `${report.studySet.title} (Đã xóa)`,
        studySetOwnerUsername: report.studySet.owner.username,
        reporterUsername: report.reporter?.username ?? null,
        reason: report.reason,
        note: report.note,
        status: 'RESOLVED',
        createdAt: report.createdAt.toISOString(),
        resolvedAt: new Date().toISOString(),
      };

      await this.prisma.client.studySet.delete({
        where: { id: report.studySetId },
      });

      return snapshot;
    }

    const updated = await this.prisma.client.contentReport.update({
      where: { id },
      data: {
        status: input.status,
        resolvedAt,
      },
      include: {
        studySet: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                username: true,
              },
            },
          },
        },
        reporter: {
          select: {
            username: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      studySetId: updated.studySetId,
      studySetTitle: updated.studySet.title,
      studySetOwnerUsername: updated.studySet.owner.username,
      reporterUsername: updated.reporter?.username ?? null,
      reason: updated.reason,
      note: updated.note,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      resolvedAt: updated.resolvedAt ? updated.resolvedAt.toISOString() : null,
    };
  }
}
