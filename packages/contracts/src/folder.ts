import { z } from 'zod';
import { studySetSummarySchema } from './study-set';

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, 'Tên thư mục không được để trống').max(80, 'Tên thư mục tối đa 80 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').nullable().optional(),
  parentId: z.string().uuid('ID thư mục cha không hợp lệ').nullable().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên thư mục không được để trống').max(80, 'Tên thư mục tối đa 80 ký tự').optional(),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').nullable().optional(),
    parentId: z.string().uuid('ID thư mục cha không hợp lệ').nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Phải cung cấp ít nhất một trường để cập nhật',
  });
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

export const folderSummarySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string(),
  description: z.string().nullable(),
  setCount: z.number().int(),
  subfolderCount: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FolderSummary = z.infer<typeof folderSummarySchema>;

export const folderDetailSchema = folderSummarySchema.extend({
  parent: folderSummarySchema.nullable().optional(),
  subfolders: z.array(folderSummarySchema).default([]),
  studySets: z.array(studySetSummarySchema),
});
export type FolderDetail = z.infer<typeof folderDetailSchema>;

export const folderMembershipSchema = z.object({
  folderIds: z.array(z.string().uuid()),
});
export type FolderMembership = z.infer<typeof folderMembershipSchema>;

export const addBatchSetsToFolderSchema = z.object({
  setIds: z.array(z.string().uuid()).min(1, 'Chọn ít nhất một bộ thẻ'),
});
export type AddBatchSetsToFolderInput = z.infer<typeof addBatchSetsToFolderSchema>;

