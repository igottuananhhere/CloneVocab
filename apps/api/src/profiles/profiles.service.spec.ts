import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

type ProfileRow = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function row(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'an-nguyen',
    displayName: 'An Nguyen',
    avatarUrl: null,
    bio: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function makeService(profileDelegate: Record<string, unknown>): ProfilesService {
  const prisma = { client: { profile: profileDelegate } } as unknown as PrismaService;
  return new ProfilesService(prisma);
}

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'an@example.com',
  role: 'authenticated',
};

describe('ProfilesService', () => {
  describe('isUsernameAvailable', () => {
    it('tu choi username trung voi duong dan cua ung dung', async () => {
      const findUnique = vi.fn();
      const service = makeService({ findUnique });

      await expect(service.isUsernameAvailable('settings')).resolves.toBe(false);
      // Tu choi ngay, khong can hoi database.
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('chap nhan username chua ai dung', async () => {
      const service = makeService({ findUnique: vi.fn().mockResolvedValue(null) });

      await expect(service.isUsernameAvailable('chua-ai-dung')).resolves.toBe(true);
    });

    it('coi username hien tai cua chinh minh la con trong', async () => {
      const service = makeService({
        findUnique: vi.fn().mockResolvedValue({ id: user.id }),
      });

      await expect(service.isUsernameAvailable('an-nguyen', user.id)).resolves.toBe(true);
    });

    it('tu choi username cua nguoi khac', async () => {
      const service = makeService({
        findUnique: vi.fn().mockResolvedValue({ id: 'nguoi-khac' }),
      });

      await expect(service.isUsernameAvailable('an-nguyen', user.id)).resolves.toBe(false);
    });
  });

  describe('update', () => {
    it('chan doi sang username da co nguoi dung', async () => {
      const update = vi.fn();
      const service = makeService({
        findUnique: vi.fn().mockResolvedValue({ id: 'nguoi-khac' }),
        update,
      });

      await expect(service.update(user, { username: 'da-co-nguoi' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('chuan hoa username ve chu thuong truoc khi ghi', async () => {
      const update = vi.fn().mockResolvedValue(row({ username: 'an-moi' }));
      const service = makeService({
        findUnique: vi.fn().mockResolvedValue(null),
        update,
      });

      await service.update(user, { username: 'AN-MOI' });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ username: 'an-moi' }) }),
      );
    });

    it('chi ghi nhung truong duoc gui len', async () => {
      const update = vi.fn().mockResolvedValue(row());
      const service = makeService({ findUnique: vi.fn(), update });

      await service.update(user, { bio: 'Xin chao' });

      expect(update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { bio: 'Xin chao' },
      });
    });
  });

  describe('getByUsername', () => {
    it('bao 404 khi khong co ho so', async () => {
      const service = makeService({ findUnique: vi.fn().mockResolvedValue(null) });

      await expect(service.getByUsername('khong-ton-tai')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('khong lo email hay updatedAt ra ho so cong khai', async () => {
      const service = makeService({ findUnique: vi.fn().mockResolvedValue(row()) });

      const profile = await service.getByUsername('an-nguyen');

      expect(profile).toEqual({
        id: user.id,
        username: 'an-nguyen',
        displayName: 'An Nguyen',
        avatarUrl: null,
        bio: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  describe('getMe', () => {
    it('tao ho so bu khi trigger dang ky chua kip chay', async () => {
      const create = vi.fn().mockResolvedValue(row({ username: 'user-11111111' }));
      const service = makeService({
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      });

      const me = await service.getMe(user);

      expect(create).toHaveBeenCalledWith({
        data: { id: user.id, username: 'user-11111111' },
      });
      expect(me.email).toBe('an@example.com');
    });
  });
});
