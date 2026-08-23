import { z } from 'zod';

/**
 * Bien moi truong duoc kiem tra ngay khi khoi dong. Thieu hoac sai dinh dang thi
 * tien trinh dung han voi thong bao ro rang, thay vi chet giua chung khi co request.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),

    DATABASE_URL: z.string().url('DATABASE_URL phai la connection string Postgres hop le'),

    SUPABASE_URL: z.string().url('SUPABASE_URL phai la URL hop le'),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    /**
     * Supabase local ky JWT bang HS256 voi secret nay. Supabase cloud doi mo hinh sang
     * khoa bat doi xung, khi do de trong bien nay va guard tu chuyen sang JWKS.
     */
    SUPABASE_JWT_SECRET: z.string().min(32).optional().or(z.literal('')),

    /** Danh sach origin duoc phep goi API, ngan cach bang dau phay. */
    WEB_ORIGIN: z.string().default('http://localhost:3000'),
  })
  .transform((env) => ({
    ...env,
    SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET === '' ? undefined : env.SUPABASE_JWT_SECRET,
    allowedOrigins: env.WEB_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Cau hinh moi truong khong hop le:\n${details}`);
  }

  return result.data;
}
