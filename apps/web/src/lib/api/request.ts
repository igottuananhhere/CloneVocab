import type { ApiError } from '@flashcard/contracts';
import { publicEnv } from '@/lib/env';

/**
 * Loi tra ve tu NestJS. Giu nguyen status va details de form hien thi loi dung o
 * tung o nhap thay vi chi mot dong thong bao chung.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /** Lay thong bao loi cho mot truong cu the trong form. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Access token cua Supabase. Bo trong voi endpoint cong khai. */
  token?: string | null;
};

/**
 * Diem duy nhat goi sang NestJS. Moi request deu di qua day nen viec them header,
 * doi cach xu ly loi hay them tracing sau nay chi phai sua mot cho.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, token, headers, ...init } = options;
  const url = `${publicEnv.apiUrl}/api/v1${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload as ApiError | null;
    throw new ApiRequestError(
      response.status,
      error?.message ?? `Yeu cau that bai (${response.status}).`,
      error?.details,
    );
  }

  return payload as T;
}
