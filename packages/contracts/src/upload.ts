import { z } from 'zod';

/** Danh sach loai anh duoc chap nhan: webp, jpeg, png. */
export const ALLOWED_IMAGE_CONTENT_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

export const requestUploadUrlSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_CONTENT_TYPES, {
    errorMap: () => ({ message: 'Loại ảnh không được hỗ trợ. Chỉ nhận WebP, JPEG hoặc PNG.' }),
  }),
});
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;

export const uploadUrlResultSchema = z.object({
  path: z.string(),
  token: z.string(),
  uploadUrl: z.string().optional(),
  publicUrl: z.string().optional(),
});
export type UploadUrlResult = z.infer<typeof uploadUrlResultSchema>;
