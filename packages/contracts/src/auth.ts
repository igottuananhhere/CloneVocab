import { z } from 'zod';

export const registerInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
