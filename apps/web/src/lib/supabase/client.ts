'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client phia trinh duyet. Chi dung cho auth (dang nhap, dang ky, doc session).
 * Truy cap du lieu di qua NestJS - anon key khong co quyen doc bang nao ca.
 */
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
