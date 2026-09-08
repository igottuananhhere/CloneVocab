import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type CreateFolderInput,
  type FolderDetail,
  type FolderSummary,
  type StudySetSummary,
  type UpdateFolderInput,
} from '@flashcard/contracts';
import { Prisma } from '@flashcard/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const SET_SUMMARY_INCLUDE = {
  owner: { select: { id: true, username: true, displayName: true } },
} as const;

type StudySetRow = Prisma.StudySetGetPayload<{ include: typeof SET_SUMMARY_INCLUDE }>;

function toSetSummary(row: StudySetRow): StudySetSummary {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    subject: row.subject,
    language: row.language,
    visibility: row.visibility,
    cardCount: row.cardCount,
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    owner: {
      id: row.owner.id,
      username: row.owner.username,
      displayName: row.owner.displayName,
    },
  };
}

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tao thu muc moi cho nguoi dung hien tai. */
  async create(user: AuthenticatedUser, input: CreateFolderInput): Promise<FolderSummary> {
    if (input.parentId) {
      await this.requireOwned(input.parentId, user);
    }

    try {
      const created = await this.prisma.client.folder.create({
        data: {
          ownerId: user.id,
          parentId: input.parentId ?? null,
          name: input.name,
          description: input.description ?? null,
        },
      });

      return {
        id: created.id,
        ownerId: created.ownerId,
        parentId: created.parentId,
        name: created.name,
        description: created.description,
        setCount: 0,
        subfolderCount: 0,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Bạn đã có thư mục mang tên "${input.name}".`);
      }
      throw error;
    }
  }

  /** Danh sach thu muc cua nguoi dung hien tai (cho sidebar va picker). */
  async listMine(user: AuthenticatedUser): Promise<FolderSummary[]> {
    const rows = await this.prisma.client.folder.findMany({
      where: { ownerId: user.id },
      include: {
        _count: { select: { links: true, children: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      ownerId: r.ownerId,
      parentId: r.parentId,
      name: r.name,
      description: r.description,
      setCount: r._count.links,
      subfolderCount: r._count.children,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /** Chi tiet thu muc cung danh sach bo the ben trong va thu muc con. */
  async getById(id: string, user?: AuthenticatedUser): Promise<FolderDetail> {
    const row = await this.prisma.client.folder.findUnique({
      where: { id },
      include: {
        parent: {
          include: {
            _count: { select: { links: true, children: true } },
          },
        },
        children: {
          include: {
            _count: { select: { links: true, children: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        links: {
          include: {
            studySet: {
              include: SET_SUMMARY_INCLUDE,
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Không tìm thấy thư mục.');
    }

    // Thu muc chi chu so huu xem duoc
    if (row.ownerId !== user?.id) {
      throw new NotFoundException('Không tìm thấy thư mục.');
    }

    const sets = row.links.map((link) => toSetSummary(link.studySet));
    const subfolders: FolderSummary[] = row.children.map((c) => ({
      id: c.id,
      ownerId: c.ownerId,
      parentId: c.parentId,
      name: c.name,
      description: c.description,
      setCount: c._count.links,
      subfolderCount: c._count.children,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return {
      id: row.id,
      ownerId: row.ownerId,
      parentId: row.parentId,
      name: row.name,
      description: row.description,
      setCount: sets.length,
      subfolderCount: subfolders.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      parent: row.parent
        ? {
            id: row.parent.id,
            ownerId: row.parent.ownerId,
            parentId: row.parent.parentId,
            name: row.parent.name,
            description: row.parent.description,
            setCount: row.parent._count.links,
            subfolderCount: row.parent._count.children,
            createdAt: row.parent.createdAt.toISOString(),
            updatedAt: row.parent.updatedAt.toISOString(),
          }
        : null,
      subfolders,
      studySets: sets,
    };
  }

  /** Cap nhat ten hoac mo ta thu muc. */
  async update(
    id: string,
    user: AuthenticatedUser,
    input: UpdateFolderInput,
  ): Promise<FolderSummary> {
    await this.requireOwned(id, user);

    if (input.parentId) {
      if (input.parentId === id) {
        throw new ConflictException('Không thể đặt thư mục làm thư mục con của chính nó.');
      }
      await this.requireOwned(input.parentId, user);
    }

    try {
      const updated = await this.prisma.client.folder.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        },
        include: {
          _count: { select: { links: true, children: true } },
        },
      });

      return {
        id: updated.id,
        ownerId: updated.ownerId,
        parentId: updated.parentId,
        name: updated.name,
        description: updated.description,
        setCount: updated._count.links,
        subfolderCount: updated._count.children,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Bạn đã có thư mục mang tên "${input.name}".`);
      }
      throw error;
    }
  }

  /** Xoa thu muc. Bo the goc khong bi anh huong (chi xoa link). */
  async remove(id: string, user: AuthenticatedUser): Promise<{ id: string }> {
    await this.requireOwned(id, user);
    await this.prisma.client.folder.delete({ where: { id } });
    return { id };
  }

  /** Them bo the vao thu muc. */
  async addSet(
    folderId: string,
    setId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.requireOwned(folderId, user);

    const studySet = await this.prisma.client.studySet.findUnique({
      where: { id: setId },
      select: { id: true, visibility: true, ownerId: true },
    });

    if (!studySet) {
      throw new NotFoundException('Không tìm thấy bộ thẻ.');
    }

    // Khong them bo the private cua nguoi khac
    if (studySet.visibility === 'PRIVATE' && studySet.ownerId !== user.id) {
      throw new NotFoundException('Không tìm thấy bộ thẻ.');
    }

    await this.prisma.client.folderStudySet.upsert({
      where: {
        folderId_studySetId: {
          folderId,
          studySetId: setId,
        },
      },
      create: {
        folderId,
        studySetId: setId,
      },
      update: {},
    });

    return { success: true };
  }

  /** Them nhieu bo the vao thu muc cung mot luc. */
  async addSetsBatch(
    folderId: string,
    setIds: string[],
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; count: number }> {
    await this.requireOwned(folderId, user);

    const studySets = await this.prisma.client.studySet.findMany({
      where: { id: { in: setIds } },
      select: { id: true, visibility: true, ownerId: true },
    });

    const validIds = studySets
      .filter((s) => s.visibility !== 'PRIVATE' || s.ownerId === user.id)
      .map((s) => s.id);

    if (validIds.length > 0) {
      await Promise.all(
        validIds.map((setId) =>
          this.prisma.client.folderStudySet.upsert({
            where: {
              folderId_studySetId: {
                folderId,
                studySetId: setId,
              },
            },
            create: {
              folderId,
              studySetId: setId,
            },
            update: {},
          }),
        ),
      );
    }

    return { success: true, count: validIds.length };
  }

  /** Xoa bo the khoi thu muc. */
  async removeSet(
    folderId: string,
    setId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.requireOwned(folderId, user);

    await this.prisma.client.folderStudySet.deleteMany({
      where: {
        folderId,
        studySetId: setId,
      },
    });

    return { success: true };
  }

  /** Kiem tra bo the dang nam trong nhung thu muc nao cua nguoi dung. */
  async checkSet(setId: string, user: AuthenticatedUser): Promise<{ folderIds: string[] }> {
    const links = await this.prisma.client.folderStudySet.findMany({
      where: {
        studySetId: setId,
        folder: { ownerId: user.id },
      },
      select: { folderId: true },
    });

    return { folderIds: links.map((l) => l.folderId) };
  }

  private async requireOwned(id: string, user: AuthenticatedUser) {
    const folder = await this.prisma.client.folder.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!folder) {
      throw new NotFoundException('Không tìm thấy thư mục.');
    }

    if (folder.ownerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
    }

    return folder;
  }
}

