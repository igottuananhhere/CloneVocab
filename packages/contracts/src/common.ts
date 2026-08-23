import { z } from 'zod';

/** Dinh dang loi thong nhat cho moi response 4xx/5xx cua API. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  /** Chi co khi loi la validation: map tu duong dan field -> danh sach loi. */
  details: z.record(z.string(), z.array(z.string())).optional(),
  path: z.string(),
  timestamp: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const uuidSchema = z.string().uuid('Giá trị phải là UUID hợp lệ');
