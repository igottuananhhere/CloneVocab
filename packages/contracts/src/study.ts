import { z } from 'zod';
import { questionTypeSchema } from './enums';

// ---------------------------------------------------------------------------
// Hoc lai ngat quang (Learn) + The ghi nho (Flip)
// Client tu cham diem (chon dung/sai hoac thuoc/chua thuoc) roi gui ket qua ve
// server de cap nhat StudyProgress. Server la noi duy nhat nam vung logic.
// ---------------------------------------------------------------------------

/** Mot cau hoi trac nghiem trong phien hoc: hien term, chon dinh nghia dung. */
export const learnItemSchema = z.object({
  flashcardId: z.string().uuid(),
  prompt: z.string(),
  choices: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});
export type LearnItem = z.infer<typeof learnItemSchema>;

export const learnSessionSchema = z.object({
  items: z.array(learnItemSchema),
});
export type LearnSession = z.infer<typeof learnSessionSchema>;

export const reviewResultSchema = z.object({
  flashcardId: z.string().uuid(),
  correct: z.boolean(),
});
export type ReviewResult = z.infer<typeof reviewResultSchema>;

export const submitReviewSchema = z.object({
  results: z.array(reviewResultSchema).min(1),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

// ---------------------------------------------------------------------------
// Kiem tra (Test)
// Cau hoi duoc sinh xac dinh (khong random) de server co the cham lai tu chinh
// du lieu the ma khong can luu phien o server.
// ---------------------------------------------------------------------------

export const testQuestionSchema = z.object({
  id: z.string(),
  flashcardId: z.string().uuid(),
  type: questionTypeSchema,
  instruction: z.string(),
  prompt: z.string(),
  /** Chi co o cau trac nghiem va dung/sai. Khong chua dap an o day. */
  choices: z.array(z.string()).optional(),
});
export type TestQuestion = z.infer<typeof testQuestionSchema>;

export const generateTestSchema = z.object({
  questions: z.array(testQuestionSchema),
});
export type GeneratedTest = z.infer<typeof generateTestSchema>;

export const submitTestSchema = z.object({
  /** Map tu questionId -> cau tra loi (chi so choice, chuoi viet, hay "true"/"false"). */
  answers: z.record(z.string(), z.string()),
  durationMs: z.number().int().min(0).optional(),
});
export type SubmitTestInput = z.infer<typeof submitTestSchema>;

export const testQuestionResultSchema = z.object({
  id: z.string(),
  flashcardId: z.string().uuid(),
  type: questionTypeSchema,
  prompt: z.string(),
  yourAnswer: z.string(),
  correctAnswer: z.string(),
  correct: z.boolean(),
});
export type TestQuestionResult = z.infer<typeof testQuestionResultSchema>;

export const testResultSchema = z.object({
  id: z.string().uuid(),
  correctCount: z.number().int(),
  totalCount: z.number().int(),
  scorePercent: z.number(),
  durationMs: z.number().int().nullable(),
  takenAt: z.string(),
  questions: z.array(testQuestionResultSchema),
});
export type TestResult = z.infer<typeof testResultSchema>;

// ---------------------------------------------------------------------------
// Ghe cap (Match)
// ---------------------------------------------------------------------------

export const matchResultSchema = z.object({
  id: z.string().uuid(),
  durationMs: z.number().int(),
  pairCount: z.number().int(),
  playedAt: z.string(),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

export const submitMatchSchema = z.object({
  durationMs: z.number().int().min(0),
  pairCount: z.number().int().min(1).max(500),
});
export type SubmitMatchInput = z.infer<typeof submitMatchSchema>;

// ---------------------------------------------------------------------------
// Thong ke hoc tap
// ---------------------------------------------------------------------------

export const studyStatsSchema = z.object({
  studiedCards: z.number().int(),
  masteredCards: z.number().int(),
  dueToday: z.number().int(),
  testCount: z.number().int(),
  matchBestMs: z.number().int().nullable(),
});
export type StudyStats = z.infer<typeof studyStatsSchema>;
