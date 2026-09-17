import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StudyService, isWrittenAnswerCorrect } from './study.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

type Delegate = Record<string, unknown>;

function makeService(delegates: {
  studySet?: Delegate;
  savedSet?: Delegate;
  studyProgress?: Delegate;
  testResult?: Delegate;
  matchResult?: Delegate;
}): StudyService {
  const prisma = {
    client: {
      studySet: delegates.studySet ?? {},
      savedSet: delegates.savedSet ?? {},
      studyProgress: delegates.studyProgress ?? {},
      testResult: delegates.testResult ?? {},
      matchResult: delegates.matchResult ?? {},
    },
  } as unknown as PrismaService;
  return new StudyService(prisma);
}

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'an@example.com',
  role: 'authenticated',
};

const privateSet = {
  id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  ownerId: '22222222-2222-4222-8222-222222222222',
  visibility: 'PRIVATE',
  flashcards: [{ id: 'c1', term: 'こんにちは', definition: 'Xin chào', position: 0 }],
};

const publicSet = {
  id: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  ownerId: user.id,
  visibility: 'PUBLIC',
  flashcards: [
    { id: 'c1', term: 'cat', definition: 'mèo', position: 0 },
    { id: 'c2', term: 'dog', definition: 'chó', position: 1 },
    { id: 'c3', term: 'bird', definition: 'chim', position: 2 },
  ],
};

describe('StudyService', () => {
  describe('getLearnSession', () => {
    it('tra 404 voi bo the private cua nguoi khac', async () => {
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(privateSet) },
      });
      await expect(service.getLearnSession(privateSet.id, user.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('tao mot item trac nghiem tren moi the', async () => {
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(publicSet) },
        studyProgress: { findMany: vi.fn().mockResolvedValue([]) },
      });

      const session = await service.getLearnSession(publicSet.id, user.id);

      expect(session.items).toHaveLength(3);
      // Theo thu tu position, item dau la c1 (dinh nghia 'mèo')
      expect(session.items[0].flashcardId).toBe('c1');
      expect(session.items[0].choices[session.items[0].correctIndex]).toBe('mèo');
      for (const item of session.items) {
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(item.choices.length);
      }
    });
  });

  describe('submitReview', () => {
    it('lan dau hoc dung -> masteryLevel 1, den han sau 1 ngay', async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(publicSet) },
        studyProgress: { findUnique: vi.fn().mockResolvedValue(null), upsert },
      });

      await service.submitReview(publicSet.id, user, {
        results: [{ flashcardId: 'c1', correct: true }],
      });

      const call = upsert.mock.calls[0][0];
      expect(call.create.masteryLevel).toBe(1);
      // nextReviewAt = now + 1 ngay
      const diffDays = (call.create.nextReviewAt - Date.now()) / 86_400_000;
      expect(diffDays).toBeGreaterThan(0.9);
      expect(diffDays).toBeLessThan(1.1);
    });

    it('tra loi sai dua masteryLevel ve 0', async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(publicSet) },
        studyProgress: {
          findUnique: vi.fn().mockResolvedValue({ masteryLevel: 3, correctCount: 5, incorrectCount: 1, streak: 2 }),
          upsert,
        },
      });

      await service.submitReview(publicSet.id, user, {
        results: [{ flashcardId: 'c1', correct: false }],
      });

      expect(upsert.mock.calls[0][0].update.masteryLevel).toBe(0);
    });
  });

  describe('generateTest', () => {
    it('sinh so cau bang so the, moi cau co prompt', async () => {
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(publicSet) },
      });

      const test = await service.generateTest(publicSet.id, user.id, 0);

      expect(test.questions).toHaveLength(3);
      expect(test.questions[0].type).toBe('MULTIPLE_CHOICE');
      expect(test.questions[0].choices).toBeDefined();
      // khong lo dap an ra ngoai
      expect((test.questions[0] as Record<string, unknown>).answer).toBeUndefined();
    });

    it('dao thu tu the khi su dung cac seed khac nhau', async () => {
      const bigSet = {
        ...publicSet,
        flashcards: Array.from({ length: 10 }, (_, i) => ({
          id: `card-${i}`,
          studySetId: publicSet.id,
          term: `Term ${i}`,
          definition: `Definition ${i}`,
          imagePath: null,
          position: i,
        })),
      };

      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(bigSet) },
      });

      const test1 = await service.generateTest(publicSet.id, user.id, 12345);
      const test2 = await service.generateTest(publicSet.id, user.id, 98765);
      const test1Repeat = await service.generateTest(publicSet.id, user.id, 12345);

      // Cung seed thi ra cung thu tu
      expect(test1.questions.map((q) => q.flashcardId)).toEqual(
        test1Repeat.questions.map((q) => q.flashcardId),
      );

      // Khac seed thi thu tu phai khac nhau
      expect(test1.questions.map((q) => q.flashcardId)).not.toEqual(
        test2.questions.map((q) => q.flashcardId),
      );
    });

    it('cau hoi True/False luon dung mau cau khang dinh "co nghia la"', async () => {
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(publicSet) },
      });

      const test = await service.generateTest(publicSet.id, user.id, 0);
      const tfQuestions = test.questions.filter((q) => q.type === 'TRUE_FALSE');

      for (const tf of tfQuestions) {
        expect(tf.prompt).toContain('có nghĩa là');
        expect(tf.prompt).not.toContain('không có nghĩa là');
      }
    });
  });

  describe('submitTest', () => {
    it('luu ket qua va tra ve tong so cau', async () => {
      const create = vi.fn().mockResolvedValue({
        id: 't1',
        correctCount: 0,
        totalCount: 3,
        scorePercent: 0,
        durationMs: null,
        takenAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      const service = makeService({
        studySet: { findUnique: vi.fn().mockResolvedValue(publicSet) },
        testResult: { create },
      });

      const result = await service.submitTest(publicSet.id, user, { answers: {} });

      expect(result.totalCount).toBe(3);
      expect(result.questions).toHaveLength(3);
      expect(create).toHaveBeenCalledOnce();
    });
  });

  describe('getStats', () => {
    it('tong hop tu cac bang tien do', async () => {
      const service = makeService({
        studyProgress: {
          count: vi
            .fn()
            .mockResolvedValueOnce(10) // studied
            .mockResolvedValueOnce(4)  // mastered
            .mockResolvedValueOnce(2)  // due
            .mockResolvedValueOnce(5)  // studiedToday
            .mockResolvedValueOnce(8), // studiedWeek
          findMany: vi.fn().mockResolvedValue([]),
        },
        studySet: { count: vi.fn().mockResolvedValue(3) },
        savedSet: { count: vi.fn().mockResolvedValue(2) },
        testResult: {
          count: vi.fn().mockResolvedValue(3),
          findMany: vi.fn().mockResolvedValue([]),
        },
        matchResult: {
          aggregate: vi.fn().mockResolvedValue({ _min: { durationMs: 12000 } }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      });

      const stats = await service.getStats(user);

      expect(stats).toEqual({
        studiedCards: 10,
        masteredCards: 4,
        dueToday: 2,
        testCount: 3,
        matchBestMs: 12000,
        wordsStudiedToday: 5,
        wordsStudiedThisWeek: 8,
        totalSetsAdded: 5,
        currentStreak: 0,
        longestStreak: 0,
        activeDates: [],
      });
    });
  });

  describe('isWrittenAnswerCorrect', () => {
    it('khop cau tra loi dung voi dinh nghia co dau cham phay va tien to bi dong', () => {
      // Truong hop thuc te cua nguoi dung: HONORED -> "vinh dự; được vinh danh"
      expect(isWrittenAnswerCorrect('Vinh danh', 'vinh dự; được vinh danh')).toBe(true);
      expect(isWrittenAnswerCorrect('vinh dự', 'vinh dự; được vinh danh')).toBe(true);
      expect(isWrittenAnswerCorrect('được vinh danh', 'vinh dự; được vinh danh')).toBe(true);
      expect(isWrittenAnswerCorrect('vinh dự; được vinh danh', 'vinh dự; được vinh danh')).toBe(true);
    });

    it('khop voi dau gach cheo va ngoac don chu thich', () => {
      expect(isWrittenAnswerCorrect('xe hơi', 'xe hơi / ô tô')).toBe(true);
      expect(isWrittenAnswerCorrect('ô tô', 'xe hơi / ô tô')).toBe(true);
      expect(isWrittenAnswerCorrect('vinh danh', '(v) vinh danh')).toBe(true);
      expect(isWrittenAnswerCorrect('listen', 'to listen')).toBe(true);
    });

    it('tu choi dap an sai', () => {
      expect(isWrittenAnswerCorrect('thất bại', 'vinh dự; được vinh danh')).toBe(false);
      expect(isWrittenAnswerCorrect('', 'vinh dự; được vinh danh')).toBe(false);
    });
  });
});
