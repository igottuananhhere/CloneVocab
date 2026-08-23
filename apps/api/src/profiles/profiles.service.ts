import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { MeProfile, Profile, UpdateProfileInput } from '@flashcard/contracts';
import type { Profile as ProfileRow } from '@flashcard/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

/** Username khong duoc phep dat vi trung voi duong dan cua ung dung. */
const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'auth',
  'dashboard',
  'explore',
  'login',
  'logout',
  'register',
  'settings',
  'sets',
  'u',
  'support',
  'help',
  'about',
  'terms',
  'privacy',
]);

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Profile duoc trigger handle_new_user tao ngay khi dang ky. Van kiem tra va tao bu
   * o day de tai khoan tao truoc khi trigger ton tai khong bi ket o trang thai loi.
   */
  async getMe(user: AuthenticatedUser): Promise<MeProfile> {
    const row =
      (await this.prisma.client.profile.findUnique({ where: { id: user.id } })) ??
      (await this.createFallbackProfile(user));

    return {
      ...toPublicProfile(row),
      email: user.email,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getByUsername(username: string): Promise<Profile> {
    const row = await this.prisma.client.profile.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!row) {
      throw new NotFoundException(`Khong tim thay nguoi dung "${username}".`);
    }

    return toPublicProfile(row);
  }

  async update(user: AuthenticatedUser, input: UpdateProfileInput): Promise<MeProfile> {
    if (input.username !== undefined) {
      await this.assertUsernameAvailable(input.username, user.id);
    }

    const row = await this.prisma.client.profile.update({
      where: { id: user.id },
      data: {
        ...(input.username !== undefined ? { username: input.username.toLowerCase() } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
    });

    return {
      ...toPublicProfile(row),
      email: user.email,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    const normalised = username.toLowerCase();

    if (RESERVED_USERNAMES.has(normalised)) {
      return false;
    }

    const existing = await this.prisma.client.profile.findUnique({
      where: { username: normalised },
      select: { id: true },
    });

    return existing === null || existing.id === currentUserId;
  }

  private async assertUsernameAvailable(username: string, currentUserId: string): Promise<void> {
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new ConflictException(`Username "${username}" duoc he thong giu cho, hay chon ten khac.`);
    }

    if (!(await this.isUsernameAvailable(username, currentUserId))) {
      throw new ConflictException(`Username "${username}" da co nguoi su dung.`);
    }
  }

  /**
   * Sinh username tam thoi khong the trung: lay 8 ky tu dau cua user id.
   * Nguoi dung doi lai duoc o trang /settings.
   */
  private async createFallbackProfile(user: AuthenticatedUser): Promise<ProfileRow> {
    return this.prisma.client.profile.create({
      data: {
        id: user.id,
        username: `user-${user.id.slice(0, 8)}`,
      },
    });
  }
}

function toPublicProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    createdAt: row.createdAt.toISOString(),
  };
}
