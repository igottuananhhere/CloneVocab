import { createClient } from '@/lib/supabase/client';
import { apiRequest, type ApiRequestOptions } from './request';

/** Goi NestJS tu Client Component, tu dinh kem access token trong session hien tai. */
export async function apiBrowser<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return apiRequest<T>(path, {
    ...options,
    token: options.token ?? session?.access_token ?? null,
  });
}
