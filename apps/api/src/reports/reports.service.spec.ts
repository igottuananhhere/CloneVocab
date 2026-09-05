import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

type Delegate = Record<string, unknown>;

function makeService(delegates: {
  studySet?: Delegate;
  contentReport?: Delegate;
}): ReportsService {
  const prisma = {
    client: {
      studySet: delegates.studySet ?? {},
      contentReport: delegates.contentReport ?? {},
    },
  } as unknown as PrismaService;
  return new ReportsService(prisma);
}

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'an@example.com',
  role: 'authenticated',
};

const setId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

describe('ReportsService', () => {
  it('gui bao cao thanh cong khi co user', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: setId });
    const create = vi.fn().mockResolvedValue({
      id: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
      studySetId: setId,
      reporterId: user.id,
      reason: 'SPAM',
      note: 'Bo the nay la spam',
      status: 'OPEN',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    const service = makeService({
      studySet: { findUnique },
      contentReport: { create },
    });

    const result = await service.createReport(
      setId,
      { reason: 'SPAM', note: 'Bo the nay la spam' },
      user,
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: setId },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        studySetId: setId,
        reporterId: user.id,
        reason: 'SPAM',
        note: 'Bo the nay la spam',
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
    expect(result.id).toBe('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');
    expect(result.createdAt).toBe('2026-09-01T00:00:00.000Z');
  });

  it('gui bao cao thanh cong khi la khach vang lai', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: setId });
    const create = vi.fn().mockResolvedValue({
      id: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
      studySetId: setId,
      reporterId: null,
      reason: 'COPYRIGHT',
      note: null,
      status: 'OPEN',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    const service = makeService({
      studySet: { findUnique },
      contentReport: { create },
    });

    const result = await service.createReport(
      setId,
      { reason: 'COPYRIGHT' },
      undefined,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        studySetId: setId,
        reporterId: null,
        reason: 'COPYRIGHT',
        note: null,
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
    expect(result.reporterId).toBeNull();
  });

  it('bao loi NotFoundException neu khong tim thay bo the', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = makeService({
      studySet: { findUnique },
    });

    await expect(
      service.createReport(setId, { reason: 'OTHER' }, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
