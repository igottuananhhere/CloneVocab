import { z } from 'zod';
import { visibilitySchema } from './enums';

/** Mot the trong bo the. Chi truong can thiet cho viec hien thi va cap nhat. */
export const flashcardSchema = z.object({
  id: z.string().uuid(),
  studySetId: z.string().uuid(),
  term: z.string(),
  definition: z.string(),
  imagePath: z.string().nullable(),
  position: z.number().int(),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

/** Du lieu mot the khi tao/sua bo the. Chua co id vi chua duoc luu. */
export const flashcardInputSchema = z.object({
  term: z.string().trim().min(1, 'Mặt trước không được để trống').max(500),
  definition: z.string().trim().min(1, 'Mặt sau không được để trống').max(2000),
  // imagePath se duoc dien boi tinh nang upload anh (P2). Tam thoi luon null.
  imagePath: z.string().trim().max(2000).nullable().optional(),
});
export type FlashcardInput = z.infer<typeof flashcardInputSchema>;

export const createStudySetSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  subject: z.string().trim().max(60).nullable().optional(),
  language: z.string().trim().min(2).max(10).default('vi'),
  visibility: visibilitySchema.default('PRIVATE'),
  flashcards: z
    .array(flashcardInputSchema)
    .min(1, 'Bộ thẻ cần ít nhất một thẻ')
    .max(500, 'Một bộ thẻ tối đa 500 thẻ'),
});
export type CreateStudySetInput = z.infer<typeof createStudySetSchema>;

export const updateStudySetSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    subject: z.string().trim().max(60).nullable().optional(),
    language: z.string().trim().min(2).max(10).optional(),
    visibility: visibilitySchema.optional(),
    // Gui flashcards nghia la thay the TOAN BO the hien tai.
    flashcards: z.array(flashcardInputSchema).min(1).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Phải cung cấp ít nhất một trường để cập nhật',
  });
export type UpdateStudySetInput = z.infer<typeof updateStudySetSchema>;

/** Thong tin tac gia duoc lo ra o trang cong khai (khong co email). */
const ownerSummarySchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
});

export const studySetSummarySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  subject: z.string().nullable(),
  language: z.string(),
  visibility: visibilitySchema,
  cardCount: z.number().int(),
  viewCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  owner: ownerSummarySchema,
});
export type StudySetSummary = z.infer<typeof studySetSummarySchema>;

/** Chi tiet mot bo the, kem danh sach the theo dung thu tu. */
export const studySetDetailSchema = studySetSummarySchema.extend({
  flashcards: z.array(flashcardSchema),
});
export type StudySetDetail = z.infer<typeof studySetDetailSchema>;

export type StudySetListQuery = {
  ownerUsername?: string;
  subject?: string;
  viewerId?: string;
};
