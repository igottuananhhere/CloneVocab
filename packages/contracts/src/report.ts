import { z } from 'zod';
import { reportReasonSchema, reportStatusSchema } from './enums';

export const createReportSchema = z.object({
  reason: reportReasonSchema,
  note: z.string().trim().max(1000, 'Ghi chú không được vượt quá 1000 ký tự').optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const reportSummarySchema = z.object({
  id: z.string().uuid(),
  studySetId: z.string().uuid(),
  reporterId: z.string().uuid().nullable().optional(),
  reason: reportReasonSchema,
  note: z.string().nullable().optional(),
  status: reportStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;
