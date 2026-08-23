import { z } from 'zod';

/**
 * Username la dinh danh cong khai trong URL /u/[username].
 * Chi cho phep chu thuong, so, gach duoi va gach ngang de URL luon an toan.
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username phai co it nhat 3 ky tu')
  .max(30, 'Username toi da 30 ky tu')
  .regex(
    /^[a-z0-9_-]+$/,
    'Username chi duoc chua chu thuong khong dau, so, gach duoi va gach ngang',
  )
  .refine((v) => !v.startsWith('-') && !v.endsWith('-'), {
    message: 'Username khong duoc bat dau hoac ket thuc bang gach ngang',
  });

export const profileSchema = z.object({
  id: z.string().uuid(),
  username: usernameSchema,
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

/** Ho so cua chinh minh: kem cac truong rieng tu khong lo ra trang cong khai. */
export const meProfileSchema = profileSchema.extend({
  email: z.string().email().nullable(),
  updatedAt: z.string(),
});
export type MeProfile = z.infer<typeof meProfileSchema>;

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: z.string().trim().min(1).max(60).nullable().optional(),
    bio: z.string().trim().max(280).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Phai cung cap it nhat mot truong de cap nhat',
  });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const usernameAvailabilitySchema = z.object({
  username: z.string(),
  available: z.boolean(),
});
export type UsernameAvailability = z.infer<typeof usernameAvailabilitySchema>;
