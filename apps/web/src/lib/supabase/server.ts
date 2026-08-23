import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client cho Server Component, Route Handler va Server Action.
 * Cookie duoc doc/ghi qua kho cookie cua Next de session lam moi duoc o phia server.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component khong duoc phep ghi cookie. Middleware da lam moi session
          // truoc do roi nen bo qua o day la an toan.
        }
      },
    },
  });
}
