import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { apiRequest, type ApiRequestOptions } from './request';

/**
 * Goi NestJS tu Server Component / Route Handler, tu dinh kem access token cua
 * nguoi dung dang dang nhap (neu co).
 */
export async function apiServer<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return apiRequest<T>(path, {
    // Du lieu nguoi dung khong duoc cache giua cac request khac nhau.
    cache: 'no-store',
    ...options,
    token: options.token ?? session?.access_token ?? null,
  });
}
