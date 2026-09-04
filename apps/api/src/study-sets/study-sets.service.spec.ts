import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudySetsService } from './study-sets.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

type Delegate = Record<string, unknown>;

function makeService(delegates: {
  studySet?: Delegate;
  profile?: Delegate;
  flashcard?: Delegate;
  savedSet?: Delegate;
  transaction?: unknown;
}): StudySetsService {
  const prisma = {
    client: {
      studySet: delegates.studySet ?? {},
      profile: delegates.profile ?? {},
      flashcard: delegates.flashcard ?? {},
      savedSet: delegates.savedSet ?? {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: delegates.transaction ?? vi.fn(),
    },
  } as unknown as PrismaService;
  return new StudySetsService(prisma);
}

const owner: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'an@example.com',
  role: 'authenticated',
};
const stranger: AuthenticatedUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'binh@example.com',
  role: 'authenticated',
};

const baseSet = {
  id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  ownerId: owner.id,
  title: 'Tiếng Nhật sơ cấp',
  description: null,
  subject: null,
  language: 'ja',
  visibility: 'PRIVATE',
  cardCount: 2,
  viewCount: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('StudySetsService', () => {
  describe('create', () => {
    it('tao bo the cung the trong mot lan goi', async () => {
      const create = vi.fn().mockResolvedValue({
        ...baseSet,
        visibility: 'PUBLIC',
        owner: { id: owner.id, username: 'an-nguyen', displayName: 'An' },
        flashcards: [
          { id: 'c1', studySetId: baseSet.id, term: 'こんにちは', definition: 'Xin chào', imagePath: null, position: 0 },
        ],
      });

      const service = makeService({ studySet: { create } });
      const result = await service.create(owner, {
        title: 'Tiếng Nhật sơ cấp',
        visibility: 'PUBLIC',
        flashcards: [{ term: 'こんにちは', definition: 'Xin chào' }],
      });

      expect(create).toHaveBeenCalledOnce();
      expect(result.cardCount).toBe(2);
      expect(result.flashcards).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('tra 404 cho bo the private voi nguoi la', async () => {
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(baseSet) },
      });

      await expect(service.getById(baseSet.id, stranger.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('tang viewCount khi nguoi la xem bo the public', async () => {
      const update = vi.fn().mockResolvedValue(null);
      const service = makeService({
        studySet: {
          findUnique: vi
            .fn()
            .mockResolvedValue({
              ...baseSet,
              visibility: 'PUBLIC',
              owner: { id: owner.id, username: 'an-nguyen', displayName: 'An' },
              flashcards: [],
            }),
          update,
        },
      });

      const result = await service.getById(baseSet.id, stranger.id);

      expect(update).toHaveBeenCalledWith({
        where: { id: baseSet.id },
        data: { viewCount: { increment: 1 } },
      });
      expect(result.viewCount).toBe(1);
    });
  });

  describe('update', () => {
    it('chan nguoi khong phai chu so huu', async () => {
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue({ ...baseSet, owner: { id: owner.id } }) },
      });

      await expect(
        service.update(baseSet.id, stranger, { title: 'Mới' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('cho phep chu so huu xoa', async () => {
      const del = vi.fn().mockResolvedValue(undefined);
      const service = makeService({
        studySet: {
          findUnique: vi.fn().mockResolvedValue({ ...baseSet, owner: { id: owner.id } }),
          delete: del,
        },
      });

      await expect(service.remove(baseSet.id, owner)).resolves.toEqual({ id: baseSet.id });
      expect(del).toHaveBeenCalledWith({ where: { id: baseSet.id } });
    });
  });

  describe('list', () => {
    it('chi tra bo the PUBLIC cho nguoi la', async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const service = makeService({
        profile: { findUnique: vi.fn().mockResolvedValue({ id: owner.id }) },
        studySet: { findMany },
      });

      await service.list({ ownerUsername: 'an-nguyen', viewerId: stranger.id });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ visibility: 'PUBLIC' }) }),
      );
    });

    it('tra 404 khi khong co nguoi dung voi username do', async () => {
      const service = makeService({
        profile: { findUnique: vi.fn().mockResolvedValue(null) },
      });

      await expect(service.list({ ownerUsername: 'khong-ton-tai' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('chuyen sang explore khi khong truyen ownerUsername', async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const count = vi.fn().mockResolvedValue(0);
      const service = makeService({
        studySet: { findMany, count },
      });

      const result = await service.list({ q: 'tieng anh', sort: 'popular', page: 1, limit: 10 });

      expect(count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: 'PUBLIC',
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'tieng anh', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
      expect('totalPages' in result).toBe(true);
    });
  });

  describe('explore', () => {
    it('tinh dung totalPages va tra ve phan trang chuan', async () => {
      const fakeSets = Array.from({ length: 5 }, (_, i) => ({
        ...baseSet,
        id: `set-${i}`,
        visibility: 'PUBLIC',
        owner: { id: owner.id, username: 'an-nguyen', displayName: 'An' },
      }));

      const findMany = vi.fn().mockResolvedValue(fakeSets);
      const count = vi.fn().mockResolvedValue(25);
      const service = makeService({
        studySet: { findMany, count },
      });

      const result = await service.explore({ page: 2, limit: 5 });

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5);
      expect(result.items).toHaveLength(5);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('save & unsave & listSaved', () => {
    it('cho phep luu bo the hop le', async () => {
      const upsert = vi.fn().mockResolvedValue({});
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue({ id: baseSet.id, visibility: 'PUBLIC', ownerId: owner.id }) },
        savedSet: { upsert },
      });

      const result = await service.save(baseSet.id, stranger);
      expect(result).toEqual({ saved: true });
      expect(upsert).toHaveBeenCalledWith({
        where: {
          userId_studySetId: {
            userId: stranger.id,
            studySetId: baseSet.id,
          },
        },
        create: {
          userId: stranger.id,
          studySetId: baseSet.id,
        },
        update: {},
      });
    });

    it('tra 404 khi luu bo the private cua nguoi khac', async () => {
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue({ id: baseSet.id, visibility: 'PRIVATE', ownerId: owner.id }) },
      });

      await expect(service.save(baseSet.id, stranger)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cho phep bo luu bo the', async () => {
      const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
      const service = makeService({
        savedSet: { deleteMany },
      });

      const result = await service.unsave(baseSet.id, stranger);
      expect(result).toEqual({ saved: false });
      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          userId: stranger.id,
          studySetId: baseSet.id,
        },
      });
    });

    it('liet ke cac bo the da luu cua nguoi dung', async () => {
      const findMany = vi.fn().mockResolvedValue([
        {
          savedAt: new Date(),
          studySet: {
            ...baseSet,
            visibility: 'PUBLIC',
            owner: { id: owner.id, username: 'an-nguyen', displayName: 'An' },
          },
        },
      ]);
      const service = makeService({
        savedSet: { findMany },
      });

      const list = await service.listSaved(stranger);
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(baseSet.id);
    });
  });

  describe('getById with isSaved', () => {
    it('tra ve isSaved = true neu nguoi xem da luu bo the', async () => {
      const service = makeService({
        studySet: {
          findUnique: vi.fn().mockResolvedValue({
            ...baseSet,
            visibility: 'PUBLIC',
            owner: { id: owner.id, username: 'an-nguyen', displayName: 'An' },
            flashcards: [],
          }),
          update: vi.fn().mockResolvedValue(null),
        },
        savedSet: {
          findUnique: vi.fn().mockResolvedValue({ userId: stranger.id, studySetId: baseSet.id }),
        },
      });

      const detail = await service.getById(baseSet.id, stranger.id);
      expect(detail.isSaved).toBe(true);
    });
  });
});
