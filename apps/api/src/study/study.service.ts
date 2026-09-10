import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type GeneratedTest,
  type LearnItem,
  type LearnSession,
  type MatchResult,
  type QuestionType,
  type StudyStats,
  type SubmitMatchInput,
  type SubmitReviewInput,
  type SubmitTestInput,
  type TestQuestion,
  type TestQuestionResult,
  type TestResult,
} from '@flashcard/contracts';
import { Prisma, type Flashcard, type StudyProgress } from '@flashcard/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

/** So ngay nghi truoc khi cac cap (nguoi dung, the) phai on lai. Chi so = masteryLevel. */
const INTERVALS_DAYS = [0, 1, 3, 7, 16, 35];
const MASTERED_LEVEL = 4;
const RELEARN_MINUTES = 10;
const TEST_MAX_QUESTIONS = 20;

type SetWithCards = Prisma.StudySetGetPayload<{ include: { flashcards: { orderBy: { position: 'asc' } } } }>;

type BuiltQuestion = {
  id: string;
  flashcardId: string;
  type: QuestionType;
  instruction: string;
  prompt: string;
  imagePath?: string | null;
  choices?: string[];
  /** Dap an dinh nghia tai server: MCQ -> chi so, WRITTEN -> chuoi da chuan hoa,
   *  TRUE_FALSE -> "true"/"false". Khong bao gio gui ve client. */
  answer: string;
  correctText: string;
};

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phien hoc (Learn / Flip): mot cau trac nghiem tren moi the, the den han nam
   * truoc. Client tu cham (chon dung sai) roi gui ve /review. Distractor duoc chon
   * xac dinh theo vi tri the nen khong can random ma van da dang.
   */
  async getLearnSession(id: string, userId?: string): Promise<LearnSession> {
    const set = await this.getStudyableSet(id, userId);
    const cards = set.flashcards;
    if (cards.length === 0) {
      return { items: [] };
    }

    const progress = await this.prisma.client.studyProgress.findMany({
      where: { userId: userId ?? '', flashcardId: { in: cards.map((card) => card.id) } },
      select: { flashcardId: true, nextReviewAt: true },
    });
    const dueAt = new Map(progress.map((row) => [row.flashcardId, row.nextReviewAt]));
    const now = Date.now();

    const ordered = [...cards].sort((a, b) => {
      const aDue = !dueAt.get(a.id) || dueAt.get(a.id)!.getTime() <= now;
      const bDue = !dueAt.get(b.id) || dueAt.get(b.id)!.getTime() <= now;
      if (aDue !== bDue) return aDue ? -1 : 1;
      return a.position - b.position;
    });

    return { items: ordered.map((card) => this.buildLearnItem(card, cards)) };
  }

  /** Cap nhat StudyProgress tu ket qua tu cham cua client. Day la noi duy nhat
   *  nam vung thuat toan spaced repetition. */
  async submitReview(
    id: string,
    user: AuthenticatedUser,
    input: SubmitReviewInput,
  ): Promise<{ updated: number }> {
    await this.getStudyableSet(id, user.id);
    const now = new Date();

    let updated = 0;
    for (const result of input.results) {
      const existing = await this.prisma.client.studyProgress.findUnique({
        where: { userId_flashcardId: { userId: user.id, flashcardId: result.flashcardId } },
      });

      const data = this.nextProgress(existing, result.correct, now);
      await this.prisma.client.studyProgress.upsert({
        where: { userId_flashcardId: { userId: user.id, flashcardId: result.flashcardId } },
        create: { userId: user.id, flashcardId: result.flashcardId, ...data, lastReviewedAt: now },
        update: { ...data, lastReviewedAt: now },
      });
      updated += 1;
    }

    return { updated };
  }

  /** Sinh de kiem tra XAC DINH (khong random) de server cham lai tu du lieu the. */
  async generateTest(id: string, userId?: string): Promise<GeneratedTest> {
    const set = await this.getStudyableSet(id, userId);
    return { questions: this.buildTestQuestions(set.flashcards).map(toPublicQuestion) };
  }

  /** Cham bai lam, luu TestResult va tra ve chi tiet tung cau. */
  async submitTest(
    id: string,
    user: AuthenticatedUser,
    input: SubmitTestInput,
  ): Promise<TestResult> {
    const set = await this.getStudyableSet(id, user.id);
    const built = this.buildTestQuestions(set.flashcards);

    let correctCount = 0;
    const questionResults: TestQuestionResult[] = built.map((question) => {
      const submitted = input.answers[question.id] ?? '';
      let correct = false;
      let yourAnswer = submitted;

      if (question.type === 'MULTIPLE_CHOICE') {
        correct = submitted === question.answer;
        yourAnswer = question.choices?.[Number(submitted)] ?? submitted;
      } else if (question.type === 'WRITTEN') {
        correct = normalize(submitted) === question.answer;
      } else {
        const submittedBool = submitted === 'true';
        correct = submittedBool === (question.answer === 'true');
        yourAnswer = submittedBool ? 'Đúng' : submitted === 'false' ? 'Sai' : submitted;
      }

      if (correct) correctCount += 1;

      return {
        id: question.id,
        flashcardId: question.flashcardId,
        type: question.type,
        prompt: question.prompt,
        yourAnswer,
        correctAnswer: question.correctText,
        correct,
      };
    });

    const total = built.length;
    const score = total === 0 ? 0 : Math.round((correctCount / total) * 1000) / 10;

    const created = await this.prisma.client.testResult.create({
      data: {
        userId: user.id,
        studySetId: id,
        correctCount,
        totalCount: total,
        scorePercent: new Prisma.Decimal(score),
        durationMs: input.durationMs ?? null,
        detail: questionResults as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: created.id,
      correctCount,
      totalCount: total,
      scorePercent: Number(created.scorePercent),
      durationMs: created.durationMs,
      takenAt: created.takenAt.toISOString(),
      questions: questionResults,
    };
  }

  async submitMatch(
    id: string,
    user: AuthenticatedUser,
    input: SubmitMatchInput,
  ): Promise<MatchResult> {
    await this.getStudyableSet(id, user.id);
    const created = await this.prisma.client.matchResult.create({
      data: { userId: user.id, studySetId: id, durationMs: input.durationMs, pairCount: input.pairCount },
    });

    return {
      id: created.id,
      durationMs: created.durationMs,
      pairCount: created.pairCount,
      playedAt: created.playedAt.toISOString(),
    };
  }

  /** Tong hop tien do hoc tap cua nguoi dung tren moi bo the. */
  async getStats(user: AuthenticatedUser): Promise<StudyStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      studied,
      mastered,
      due,
      tests,
      matchAgg,
      studiedToday,
      studiedWeek,
      ownedSetsCount,
      savedSetsCount,
      progressDates,
      testDates,
      matchDates,
    ] = await Promise.all([
      this.prisma.client.studyProgress.count({ where: { userId: user.id } }),
      this.prisma.client.studyProgress.count({
        where: { userId: user.id, masteryLevel: { gte: MASTERED_LEVEL } },
      }),
      this.prisma.client.studyProgress.count({
        where: { userId: user.id, nextReviewAt: { lte: now } },
      }),
      this.prisma.client.testResult.count({ where: { userId: user.id } }),
      this.prisma.client.matchResult.aggregate({
        where: { userId: user.id },
        _min: { durationMs: true },
      }),
      this.prisma.client.studyProgress.count({
        where: {
          userId: user.id,
          lastReviewedAt: { gte: startOfToday },
        },
      }),
      this.prisma.client.studyProgress.count({
        where: {
          userId: user.id,
          lastReviewedAt: { gte: startOfWeek },
        },
      }),
      this.prisma.client.studySet.count({ where: { ownerId: user.id } }),
      this.prisma.client.savedSet.count({ where: { userId: user.id } }),
      this.prisma.client.studyProgress.findMany({
        where: { userId: user.id, lastReviewedAt: { not: null } },
        select: { lastReviewedAt: true },
      }),
      this.prisma.client.testResult.findMany({
        where: { userId: user.id },
        select: { takenAt: true },
      }),
      this.prisma.client.matchResult.findMany({
        where: { userId: user.id },
        select: { playedAt: true },
      }),
    ]);

    const allStudyDates: Date[] = [
      ...progressDates.map((p) => p.lastReviewedAt!).filter(Boolean),
      ...testDates.map((t) => t.takenAt).filter(Boolean),
      ...matchDates.map((m) => m.playedAt).filter(Boolean),
    ];

    const { activeDates, currentStreak, longestStreak } = calculateStreakStats(allStudyDates, now);

    return {
      studiedCards: studied,
      masteredCards: mastered,
      dueToday: due,
      testCount: tests,
      matchBestMs: matchAgg._min.durationMs ?? null,
      wordsStudiedToday: studiedToday,
      wordsStudiedThisWeek: studiedWeek,
      totalSetsAdded: ownedSetsCount + savedSetsCount,
      currentStreak,
      longestStreak,
      activeDates,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Bo the phai thuoc ve nguoi dung hoac la cong khai/link; private cua nguoi
   *  khac tra 404 (khong lo ro su ton tai). */
  private async getStudyableSet(id: string, userId?: string): Promise<SetWithCards> {
    const set = await this.prisma.client.studySet.findUnique({
      where: { id },
      include: { flashcards: { orderBy: { position: 'asc' } } },
    });

    if (!set) {
      throw new NotFoundException('Không tìm thấy bộ thẻ.');
    }

    const isOwner = userId === set.ownerId;
    if (set.visibility === 'PRIVATE' && !isOwner) {
      throw new NotFoundException('Không tìm thấy bộ thẻ.');
    }

    return set;
  }

  private buildLearnItem(card: Flashcard, allCards: Flashcard[]): LearnItem {
    const correct = card.definition;
    const distractors = this.pickDistractors(card, allCards, 3);
    const choices = [correct, ...distractors];
    const target = ((card.position % choices.length) + choices.length) % choices.length;

    const rotated = [...choices];
    rotated.splice(0, 1);
    rotated.splice(target, 0, correct);

    return {
      flashcardId: card.id,
      prompt: card.term,
      imagePath: card.imagePath,
      choices: rotated,
      correctIndex: target,
    };
  }

  /** Sinh cau hoi kiem tra XAC DINH tu danh sach the. */
  private buildTestQuestions(cards: Flashcard[]): BuiltQuestion[] {
    const usable = cards.slice(0, TEST_MAX_QUESTIONS);
    const types: QuestionType[] = ['MULTIPLE_CHOICE', 'WRITTEN', 'TRUE_FALSE'];

    return usable.map((card, index) => {
      const type = types[index % 3]!;

      if (type === 'MULTIPLE_CHOICE') {
        const correct = card.definition;
        const distractors = this.pickDistractors(card, cards, 3);
        const choices = [correct, ...distractors];
        const target = ((card.position % choices.length) + choices.length) % choices.length;
        const rotated = [...choices];
        rotated.splice(0, 1);
        rotated.splice(target, 0, correct);
        return {
          id: `${card.id}:MC`,
          flashcardId: card.id,
          type,
          instruction: 'Chọn định nghĩa đúng',
          prompt: card.term,
          imagePath: card.imagePath,
          choices: rotated,
          answer: String(target),
          correctText: correct,
        };
      }

      if (type === 'WRITTEN') {
        const reverse = index % 2 === 1;
        return {
          id: `${card.id}:W`,
          flashcardId: card.id,
          type,
          instruction: reverse ? 'Nhập thuật ngữ' : 'Nhập định nghĩa',
          prompt: reverse ? card.definition : card.term,
          imagePath: reverse ? null : card.imagePath,
          answer: normalize(reverse ? card.term : card.definition),
          correctText: reverse ? card.term : card.definition,
        };
      }

      // TRUE_FALSE
      const distractor = this.pickDistractors(card, cards, 1)[0];
      const truthful = distractor ? index % 2 === 0 : true;
      const candidate = truthful ? card.definition : (distractor ?? card.definition);
      return {
        id: `${card.id}:TF`,
        flashcardId: card.id,
        type,
        instruction: 'Đúng hay sai?',
        prompt: `"${card.term}" ${truthful ? 'có nghĩa là' : 'không có nghĩa là'} "${candidate}"`,
        imagePath: card.imagePath,
        answer: String(truthful),
        correctText: truthful ? 'Đúng' : 'Sai',
      };
    });
  }

  /** Chon n dinh nghia khac cua cac the khac, xac dinh theo vi tri (khong random). */
  private pickDistractors(card: Flashcard, allCards: Flashcard[], n: number): string[] {
    const others = allCards.filter(
      (other) => other.id !== card.id && other.definition !== card.definition,
    );
    if (others.length === 0) return [];

    const start = (allCards.indexOf(card) + 1) % others.length;
    const out: string[] = [];
    for (let step = 0; step < others.length && out.length < n; step += 1) {
      const candidate = others[(start + step) % others.length]!.definition;
      if (!out.includes(candidate)) out.push(candidate);
    }
    return out;
  }

  /** Tinh masteryLevel va nextReviewAt moi tu ket qua dung/sai. */
  private nextProgress(
    existing: StudyProgress | null,
    correct: boolean,
    now: Date,
  ): {
    masteryLevel: number;
    correctCount: number;
    incorrectCount: number;
    streak: number;
    nextReviewAt: Date;
  } {
    const base = existing ?? { masteryLevel: 0, correctCount: 0, incorrectCount: 0, streak: 0 };

    if (correct) {
      const newLevel = Math.min(INTERVALS_DAYS.length - 1, base.masteryLevel + 1);
      return {
        masteryLevel: newLevel,
        correctCount: base.correctCount + 1,
        incorrectCount: base.incorrectCount,
        streak: base.streak + 1,
        nextReviewAt: this.addDays(now, INTERVALS_DAYS[newLevel]!),
      };
    }

    return {
      masteryLevel: 0,
      correctCount: base.correctCount,
      incorrectCount: base.incorrectCount + 1,
      streak: 0,
      nextReviewAt: this.addMinutes(now, RELEARN_MINUTES),
    };
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
  }
}

function toPublicQuestion(question: BuiltQuestion): TestQuestion {
  return {
    id: question.id,
    flashcardId: question.flashcardId,
    type: question.type,
    instruction: question.instruction,
    prompt: question.prompt,
    imagePath: question.imagePath,
    ...(question.choices ? { choices: question.choices } : {}),
  };
}

/** Chuan hoa cau tra loi viet: thuong, bo dau cau, gian cach thua. GIU nguyen dau
 *  tieng Viet vi co y nghia (co != co). */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chuyen doi thoi diem sang chuoi YYYY-MM-DD theo gio Viet Nam (GMT+7) */
function toLocalDateKey(d: Date): string {
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/** Tinh toan chuoi ngay hoc (Streak) va danh sach cac ngay da hoc */
function calculateStreakStats(
  rawDates: Date[],
  now: Date,
): { activeDates: string[]; currentStreak: number; longestStreak: number } {
  const activeSet = new Set<string>();
  for (const d of rawDates) {
    if (d && !isNaN(d.getTime())) {
      activeSet.add(toLocalDateKey(d));
    }
  }

  const activeDates = Array.from(activeSet).sort();
  if (activeDates.length === 0) {
    return { activeDates: [], currentStreak: 0, longestStreak: 0 };
  }

  // Tinh ky luc chuoi ngay hoc lien tiep dai nhat
  let longestStreak = 1;
  let currentRun = 1;
  for (let i = 1; i < activeDates.length; i++) {
    const prev = new Date(activeDates[i - 1] + 'T00:00:00Z');
    const next = new Date(activeDates[i] + 'T00:00:00Z');
    const diffDays = Math.round((next.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else if (diffDays > 1) {
      currentRun = 1;
    }
  }

  // Tinh chuoi ngay hien tai (ket thuc hom nay hoac hom qua chua bi dut)
  const todayKey = toLocalDateKey(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = toLocalDateKey(yesterday);

  let currentStreak = 0;
  if (activeSet.has(todayKey)) {
    currentStreak = 1;
    let check = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    while (true) {
      const key = toLocalDateKey(check);
      if (activeSet.has(key)) {
        currentStreak++;
        check = new Date(check.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  } else if (activeSet.has(yesterdayKey)) {
    currentStreak = 1;
    let check = new Date(yesterday.getTime() - 24 * 60 * 60 * 1000);
    while (true) {
      const key = toLocalDateKey(check);
      if (activeSet.has(key)) {
        currentStreak++;
        check = new Date(check.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  return {
    activeDates,
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
}
