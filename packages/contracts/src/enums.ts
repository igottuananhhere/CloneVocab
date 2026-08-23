import { z } from 'zod';

/**
 * Cac enum dung chung giua web va api.
 * Gia tri phai trung khop 1-1 voi enum tuong ung trong packages/db/prisma/schema.prisma.
 */

export const visibilitySchema = z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']);
export type Visibility = z.infer<typeof visibilitySchema>;

export const reportStatusSchema = z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

/** Dang cau hoi dung trong che do Learn/Test (P3). Khai bao som de schema du lieu on dinh. */
export const questionTypeSchema = z.enum(['MULTIPLE_CHOICE', 'WRITTEN', 'TRUE_FALSE']);
export type QuestionType = z.infer<typeof questionTypeSchema>;
