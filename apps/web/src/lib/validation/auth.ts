import { z } from 'zod';

/**
 * Chi kiem tra o phia client de bao loi som. Supabase Auth van la noi thuc thi that su -
 * chinh sach mat khau cau hinh trong supabase/config.toml.
 */
export const emailSchema = z.string().trim().min(1, 'Vui long nhap email').email('Email khong hop le');

export const passwordSchema = z
  .string()
  .min(8, 'Mat khau phai co it nhat 8 ky tu')
  .max(72, 'Mat khau toi da 72 ky tu');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui long nhap mat khau'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mat khau nhap lai khong khop',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/** Doi loi cua Zod thanh map field -> thong bao dau tien, dung truc tiep cho form. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    result[key] ??= issue.message;
  }
  return result;
}
