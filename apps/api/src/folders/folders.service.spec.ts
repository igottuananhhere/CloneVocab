import { describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@flashcard/db';
import { FoldersService } from './folders.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

type Delegate = Record<string, unknown>;

function makeService(delegates: {
  folder?: Delegate;
  folderStudySet?: Delegate;
  studySet?: Delegate;
}): FoldersService {
  const prisma = {
    client: {
      folder: delegates.folder ?? {},
      folderStudySet: delegates.folderStudySet ?? {},
      studySet: delegates.studySet ?? {},
    },
  } as unknown as PrismaService;
  return new FoldersService(prisma);
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

const baseFolder = {
  id: 'ffffffff-1111-4111-8111-ffffffffffff',
  ownerId: owner.id,
  name: 'Từ vựng JLPT N3',
  description: 'Gom các bộ thẻ N3',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('FoldersService', () => {
  describe('create', () => {
    it('tao thu muc thanh cong', async () => {
      const create = vi.fn().mockResolvedValue(baseFolder);
      const service = makeService({ folder: { create } });

      const result = await service.create(owner, {
        name: 'Từ vựng JLPT N3',
        description: 'Gom các bộ thẻ N3',
      });

      expect(create).toHaveBeenCalledWith({
        data: {
          ownerId: owner.id,
          name: 'Từ vựng JLPT N3',
          description: 'Gom các bộ thẻ N3',
        },
      });
      expect(result.id).toBe(baseFolder.id);
      expect(result.setCount).toBe(0);
    });

    it('nem ConflictException khi ten thu muc bi trung', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      const create = vi.fn().mockRejectedValue(p2002);
      const service = makeService({ folder: { create } });

      await expect(service.create(owner, { name: 'Trùng tên' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('listMine', () => {
    it('tra ve danh sach thu muc cua nguoi dung kem setCount', async () => {
      const findMany = vi.fn().mockResolvedValue([
        {
          ...baseFolder,
          _count: { links: 3 },
        },
      ]);
      const service = makeService({ folder: { findMany } });

      const result = await service.listMine(owner);

      expect(result).toHaveLength(1);
      expect(result[0]?.setCount).toBe(3);
    });
  });

  describe('getById', () => {
    it('tra ve chi tiet thu muc va cac bo the ben trong', async () => {
      const findUnique = vi.fn().mockResolvedValue({
        ...baseFolder,
        links: [
          {
            studySet: {
              id: 'set-1',
              ownerId: owner.id,
              title: 'Kanji N3',
              description: null,
              subject: 'Tiếng Nhật',
              language: 'ja',
              visibility: 'PUBLIC',
              cardCount: 20,
              viewCount: 15,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              owner: { id: owner.id, username: 'an-nguyen', displayName: 'An' },
            },
          },
        ],
      });
      const service = makeService({ folder: { findUnique } });

      const result = await service.getById(baseFolder.id, owner);

      expect(result.id).toBe(baseFolder.id);
      expect(result.studySets).toHaveLength(1);
      expect(result.studySets[0]?.title).toBe('Kanji N3');
    });

    it('nem NotFoundException khi nguoi la truy cap thu muc', async () => {
      const findUnique = vi.fn().mockResolvedValue(baseFolder);
      const service = makeService({ folder: { findUnique } });

      await expect(service.getById(baseFolder.id, stranger)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('cho phep chu so huu cap nhat thu muc', async () => {
      const findUnique = vi.fn().mockResolvedValue(baseFolder);
      const update = vi.fn().mockResolvedValue({
        ...baseFolder,
        name: 'Tên mới',
        _count: { links: 0 },
      });
      const service = makeService({ folder: { findUnique, update } });

      const result = await service.update(baseFolder.id, owner, { name: 'Tên mới' });

      expect(result.name).toBe('Tên mới');
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Tên mới' }),
        }),
      );
    });

    it('chan nguoi khong phai chu so huu sua thu muc', async () => {
      const findUnique = vi.fn().mockResolvedValue(baseFolder);
      const service = makeService({ folder: { findUnique } });

      await expect(
        service.update(baseFolder.id, stranger, { name: 'Tên mới' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('cho phep chu so huu xoa thu muc', async () => {
      const findUnique = vi.fn().mockResolvedValue(baseFolder);
      const del = vi.fn().mockResolvedValue(undefined);
      const service = makeService({ folder: { findUnique, delete: del } });

      const result = await service.remove(baseFolder.id, owner);

      expect(result).toEqual({ id: baseFolder.id });
      expect(del).toHaveBeenCalledWith({ where: { id: baseFolder.id } });
    });
  });

  describe('addSet & removeSet', () => {
    it('cho phep them bo the hop le vao thu muc', async () => {
      const findFolder = vi.fn().mockResolvedValue(baseFolder);
      const findSet = vi.fn().mockResolvedValue({ id: 's1', visibility: 'PUBLIC', ownerId: owner.id });
      const upsert = vi.fn().mockResolvedValue({});
      const service = makeService({
        folder: { findUnique: findFolder },
        studySet: { findUnique: findSet },
        folderStudySet: { upsert },
      });

      const result = await service.addSet(baseFolder.id, 's1', owner);

      expect(result).toEqual({ success: true });
      expect(upsert).toHaveBeenCalledWith({
        where: {
          folderId_studySetId: {
            folderId: baseFolder.id,
            studySetId: 's1',
          },
        },
        create: {
          folderId: baseFolder.id,
          studySetId: 's1',
        },
        update: {},
      });
    });

    it('tu choi them bo the private cua nguoi khac vao thu muc', async () => {
      const findFolder = vi.fn().mockResolvedValue(baseFolder);
      const findSet = vi.fn().mockResolvedValue({ id: 's1', visibility: 'PRIVATE', ownerId: stranger.id });
      const service = makeService({
        folder: { findUnique: findFolder },
        studySet: { findUnique: findSet },
      });

      await expect(service.addSet(baseFolder.id, 's1', owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('cho phep go bo the khoi thu muc', async () => {
      const findFolder = vi.fn().mockResolvedValue(baseFolder);
      const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
      const service = makeService({
        folder: { findUnique: findFolder },
        folderStudySet: { deleteMany },
      });

      const result = await service.removeSet(baseFolder.id, 's1', owner);

      expect(result).toEqual({ success: true });
      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          folderId: baseFolder.id,
          studySetId: 's1',
        },
      });
    });
  });

  describe('checkSet', () => {
    it('tra ve danh sach folderId chua bo the', async () => {
      const findMany = vi.fn().mockResolvedValue([{ folderId: 'f1' }, { folderId: 'f2' }]);
      const service = makeService({
        folderStudySet: { findMany },
      });

      const result = await service.checkSet('s1', owner);

      expect(result.folderIds).toEqual(['f1', 'f2']);
    });
  });
});

