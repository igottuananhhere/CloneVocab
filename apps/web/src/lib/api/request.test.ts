import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiRequestError } from './request';

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('goi dung duong dan co tien to phien ban', async () => {
    mockFetch(200, { ok: true });

    await apiRequest('/profiles/me');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/profiles/me',
      expect.any(Object),
    );
  });

  it('chi dinh kem Authorization khi co token', async () => {
    mockFetch(200, {});

    await apiRequest('/profiles/me');
    const withoutToken = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect((withoutToken.headers as Record<string, string>).Authorization).toBeUndefined();

    await apiRequest('/profiles/me', { token: 'abc' });
    const withToken = vi.mocked(fetch).mock.calls[1]?.[1] as RequestInit;
    expect((withToken.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('chuyen loi cua API thanh ApiRequestError giu nguyen status va details', async () => {
    mockFetch(400, {
      statusCode: 400,
      error: 'ValidationError',
      message: 'Du lieu gui len khong hop le.',
      details: { username: ['Username toi da 30 ky tu'] },
      path: '/api/v1/profiles/me',
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    const error = await apiRequest('/profiles/me', { method: 'PATCH', body: {} }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).status).toBe(400);
    expect((error as ApiRequestError).fieldError('username')).toBe('Username toi da 30 ky tu');
  });

  it('van bao loi ro rang khi API tra ve than rong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('khong phai JSON');
        },
      }),
    );

    await expect(apiRequest('/profiles/me')).rejects.toThrowError(/502/);
  });

  it('tra ve undefined voi 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await expect(apiRequest('/sets/abc')).resolves.toBeUndefined();
  });
});
