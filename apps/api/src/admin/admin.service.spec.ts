import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import type { PrismaService } from '../prisma/prisma.service';

type Delegate = Record<string, unknown>;

function makeService(delegates: {
  profile?: Delegate;
  studySet?: Delegate;
  flashcard?: Delegate;
  testResult?: Delegate;
  matchResult?: Delegate;
  contentReport?: Delegate;
}): AdminService {
  const prisma = {
    client: {
      profile: delegates.profile ?? {},
      studySet: delegates.studySet ?? {},
      flashcard: delegates.flashcard ?? {},
      testResult: delegates.testResult ?? {},
      matchResult: delegates.matchResult ?? {},
      contentReport: delegates.contentReport ?? {},
    },
  } as unknown as PrismaService;
  return new AdminService(prisma);
}

describe('AdminService', () => {
  it('tinh toan day du so lieu thong ke getStats()', async () => {
    const service = makeService({
      profile: {
        count: vi.fn().mockResolvedValue(10),
        findMany: vi.fn().mockResolvedValue([
          {
            id: '11111111-1111-4111-8111-111111111111',
            username: 'tuantr0312',
            displayName: 'Tuan',
            avatarUrl: null,
            role: 'ADMIN',
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
          },
        ]),
      },
      studySet: {
        count: vi.fn().mockResolvedValue(25),
        findMany: vi.fn().mockResolvedValue([
          {
            id: '22222222-2222-4222-8222-222222222222',
            title: 'Từ vựng tiếng Anh',
            cardCount: 20,
            visibility: 'PUBLIC',
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            owner: { username: 'tuantr0312' },
          },
        ]),
      },
      flashcard: {
        count: vi.fn().mockResolvedValue(150),
      },
      testResult: {
        count: vi.fn().mockResolvedValue(30),
      },
      matchResult: {
        count: vi.fn().mockResolvedValue(45),
      },
      contentReport: {
        count: vi.fn().mockResolvedValue(2),
      },
    });

    const stats = await service.getStats();

    expect(stats.totalUsers).toBe(10);
    expect(stats.totalStudySets).toBe(25);
    expect(stats.totalFlashcards).toBe(150);
    expect(stats.totalStudySessions).toBe(75);
    expect(stats.pendingReportsCount).toBe(2);
    expect(stats.recentUsers).toHaveLength(1);
    expect(stats.recentUsers[0]?.username).toBe('tuantr0312');
    expect(stats.recentSets).toHaveLength(1);
    expect(stats.recentSets[0]?.ownerUsername).toBe('tuantr0312');
  });

  it('lay danh sach bao cao vi pham co phan trang getReports()', async () => {
    const service = makeService({
      contentReport: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: '33333333-3333-4333-8333-333333333333',
            studySetId: '22222222-2222-4222-8222-222222222222',
            reason: 'SPAM',
            note: 'Nội dung spam',
            status: 'OPEN',
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            resolvedAt: null,
            studySet: {
              id: '22222222-2222-4222-8222-222222222222',
              title: 'Bộ thẻ spam',
              owner: { username: 'spammer' },
            },
            reporter: { username: 'reporter1' },
          },
        ]),
      },
    });

    const res = await service.getReports({ status: 'OPEN', page: 1, limit: 10 });

    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.studySetTitle).toBe('Bộ thẻ spam');
    expect(res.items[0]?.reporterUsername).toBe('reporter1');
  });

  it('bao loi NotFoundException neu khong tim thay report khi resolve', async () => {
    const service = makeService({
      contentReport: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.resolveReport('33333333-3333-4333-8333-333333333333', {
        status: 'RESOLVED',
        action: 'NONE',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
