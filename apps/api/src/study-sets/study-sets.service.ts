import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type CreateStudySetInput,
  type PaginatedStudySets,
  type StudySetDetail,
  type StudySetListQuery,
  type StudySetSummary,
  type UpdateStudySetInput,
  type Visibility,
} from '@flashcard/contracts';
import { Prisma, type Profile, type StudySet } from '@flashcard/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const SUMMARY_INCLUDE = {
  owner: { select: { id: true, username: true, displayName: true } },
} as const;

const DETAIL_INCLUDE = {
  owner: { select: { id: true, username: true, displayName: true } },
  flashcards: { orderBy: { position: 'asc' } },
} as const;

type SummaryRow = Prisma.StudySetGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
type DetailRow = Prisma.StudySetGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class StudySetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tao bo the cung toan bo the trong mot transaction. Trigger `card_count` o
   * database tu cap nhat so luong the, nen khong can tinh bang tay o day.
   */
  async create(user: AuthenticatedUser, input: CreateStudySetInput): Promise<StudySetDetail> {
    const created = await this.prisma.client.studySet.create({
      data: {
        ownerId: user.id,
        title: input.title,
        description: input.description ?? null,
        subject: input.subject ?? null,
        language: input.language,
        visibility: input.visibility,
        flashcards: {
          create: input.flashcards.map((card, index) => ({
            term: card.term,
            definition: card.definition,
            imagePath: card.imagePath ?? null,
            position: index,
          })),
        },
      },
      include: DETAIL_INCLUDE,
    });

    return toDetail(created);
  }

  /** Toan bo bo the cua nguoi dung hien tai (ke ca private), cho dashboard. */
  async listMine(user: AuthenticatedUser): Promise<StudySetSummary[]> {
    const rows = await this.prisma.client.studySet.findMany({
      where: { ownerId: user.id },
      include: SUMMARY_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map(toSummary);
  }

  /**
   * Liet ke bo the - hoac theo nguoi dung cu the (trang /u/[username]),
   * hoac kham pha toan bo bo the cong khai (trang /explore).
   */
  async list(query: StudySetListQuery): Promise<StudySetSummary[] | PaginatedStudySets> {
    if (query.ownerUsername) {
      return this.listByOwner({
        ownerUsername: query.ownerUsername,
        subject: query.subject,
        viewerId: query.viewerId,
      });
    }

    return this.explore({
      q: query.q,
      subject: query.subject,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Liet ke bo the cong khai cua mot nguoi dung (trang /u/[username]).
   * Nguoi la chi thay bo the PUBLIC; chinh chu so huu xem duoc ca PRIVATE/UNLISTED.
   */
  async listByOwner(query: {
    ownerUsername: string;
    subject?: string;
    viewerId?: string;
  }): Promise<StudySetSummary[]> {
    const owner = await this.prisma.client.profile.findUnique({
      where: { username: query.ownerUsername.toLowerCase() },
      select: { id: true },
    });

    if (!owner) {
      throw new NotFoundException(`Không tìm thấy người dùng "${query.ownerUsername}".`);
    }

    const isSelf = query.viewerId === owner.id;

    const rows = await this.prisma.client.studySet.findMany({
      where: {
        ownerId: owner.id,
        ...(isSelf ? {} : { visibility: 'PUBLIC' as Visibility }),
        ...(query.subject ? { subject: query.subject } : {}),
      },
      include: SUMMARY_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map(toSummary);
  }

  /**
   * Kham pha va tim kiem bo the cong khai: loc theo mon hoc, tim theo tu khoa,
   * sap xep theo moi nhat/pho bien va phan trang.
   */
  async explore(query: {
    q?: string;
    subject?: string;
    sort?: 'latest' | 'popular';
    page?: number;
    limit?: number;
  }): Promise<PaginatedStudySets> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 12));
    const skip = (page - 1) * limit;

    const where: Prisma.StudySetWhereInput = {
      visibility: 'PUBLIC' as Visibility,
      ...(query.subject ? { subject: { equals: query.subject, mode: 'insensitive' } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
              { subject: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.StudySetOrderByWithRelationInput =
      query.sort === 'popular' ? { viewCount: 'desc' } : { updatedAt: 'desc' };

    const [total, rows] = await Promise.all([
      this.prisma.client.studySet.count({ where }),
      this.prisma.client.studySet.findMany({
        where,
        include: SUMMARY_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rows.map(toSummary),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Chi tiet mot bo the. Bo the PRIVATE chi chu so huu moi xem duoc - nguoi khac
   * nhan 404 (khong lo ro su ton tai). Bo the PUBLIC duoc tang viewCount khi nguoi
   * khac xem, de xep hang Explore khong phai dem rieng.
   */
  async getById(id: string, viewerId?: string): Promise<StudySetDetail> {
    const row = await this.prisma.client.studySet.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException('Không tìm thấy bộ thẻ.');
    }

    const isOwner = viewerId === row.ownerId;
    if (!isOwner && row.visibility === 'PRIVATE') {
      throw new NotFoundException('Không tìm thấy bộ thẻ.');
    }

    if (!isOwner && row.visibility === 'PUBLIC') {
      await this.prisma.client.studySet.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
      row.viewCount += 1;
    }

    return toDetail(row);
  }

  async update(
    id: string,
    user: AuthenticatedUser,
    input: UpdateStudySetInput,
  ): Promise<StudySetDetail> {
    await this.requireOwned(id, user);

    const data: Prisma.StudySetUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    };

    let updated: DetailRow;

    if (input.flashcards) {
      // Thay the toan bo the: xoa sach roi tao lai trong cung mot transaction de
      // trigger card_count khong bi lech. Tien do hoc (P3) se duoc thiet ke lai
      // de khong mat du lieu khi sua the.
      updated = await this.prisma.client.$transaction(async (tx) => {
        await tx.flashcard.deleteMany({ where: { studySetId: id } });
        return tx.studySet.update({
          where: { id },
          data: {
            ...data,
            flashcards: {
              create: input.flashcards!.map((card, index) => ({
                term: card.term,
                definition: card.definition,
                imagePath: card.imagePath ?? null,
                position: index,
              })),
            },
          },
          include: DETAIL_INCLUDE,
        });
      });
    } else {
      updated = await this.prisma.client.studySet.update({
        where: { id },
        data,
        include: DETAIL_INCLUDE,
      });
    }

    return toDetail(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ id: string }> {
    await this.requireOwned(id, user);
    await this.prisma.client.studySet.delete({ where: { id } });
    return { id };
  }

  /** Nam bat quyen: tra ve bo the neu thuoc ve nguoi dung, nguoc lai nem loi. */
  private async requireOwned(
    id: string,
    user: AuthenticatedUser,
  ): Promise<StudySet & { owner: Profile }> {
    const row = await this.prisma.client.studySet.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!row) {
      throw new NotFoundException('Không tìm thấy bộ thẻ.');
    }

    if (row.ownerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
    }

    return row;
  }
}

function toSummary(row: SummaryRow): StudySetSummary {
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

function toDetail(row: DetailRow): StudySetDetail {
  return {
    ...toSummary(row),
    flashcards: row.flashcards.map((card) => ({
      id: card.id,
      studySetId: card.studySetId,
      term: card.term,
      definition: card.definition,
      imagePath: card.imagePath,
      position: card.position,
    })),
  };
}
