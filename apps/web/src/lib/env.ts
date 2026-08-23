/**
 * Bien moi truong phia client. Next chi thay the cac bien NEXT_PUBLIC_* khi chung
 * duoc viet nguyen van trong ma nguon, nen phai truy cap tung bien mot chu khong
 * duyet qua process.env bang bien so.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Thieu bien moi truong ${name}. Kiem tra file .env o thu muc goc.`);
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
} as const;
