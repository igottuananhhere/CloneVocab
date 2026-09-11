import { z } from 'zod';
import { reportReasonSchema, reportStatusSchema, roleSchema, visibilitySchema } from './enums';

export const adminRecentUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: roleSchema,
  createdAt: z.string(),
});
export type AdminRecentUser = z.infer<typeof adminRecentUserSchema>;

export const adminRecentSetSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  ownerUsername: z.string(),
  cardCount: z.number().int().nonnegative(),
  visibility: visibilitySchema,
  createdAt: z.string(),
});
export type AdminRecentSet = z.infer<typeof adminRecentSetSchema>;

export const adminOverviewStatsSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  totalStudySets: z.number().int().nonnegative(),
  totalFlashcards: z.number().int().nonnegative(),
  totalStudySessions: z.number().int().nonnegative(),
  pendingReportsCount: z.number().int().nonnegative(),
  recentUsers: z.array(adminRecentUserSchema),
  recentSets: z.array(adminRecentSetSchema),
});
export type AdminOverviewStats = z.infer<typeof adminOverviewStatsSchema>;

export const adminReportQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type AdminReportQuery = z.infer<typeof adminReportQuerySchema>;

export const adminReportItemSchema = z.object({
  id: z.string().uuid(),
  studySetId: z.string().uuid(),
  studySetTitle: z.string(),
  studySetOwnerUsername: z.string(),
  reporterUsername: z.string().nullable(),
  reason: reportReasonSchema,
  note: z.string().nullable(),
  status: reportStatusSchema,
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type AdminReportItem = z.infer<typeof adminReportItemSchema>;

export const adminReportListResponseSchema = z.object({
  items: z.array(adminReportItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});
export type AdminReportListResponse = z.infer<typeof adminReportListResponseSchema>;

export const resolveReportInputSchema = z.object({
  status: reportStatusSchema,
  action: z.enum(['NONE', 'MAKE_PRIVATE', 'DELETE_SET']).default('NONE'),
});
export type ResolveReportInput = z.infer<typeof resolveReportInputSchema>;
