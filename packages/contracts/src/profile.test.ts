import { describe, expect, it } from 'vitest';
import { updateProfileSchema, usernameSchema } from './profile';

describe('usernameSchema', () => {
  it.each(['an-nguyen', 'user_01', 'abc', 'a'.repeat(30)])('chap nhan "%s"', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ['ab', 'ngan hon 3 ky tu'],
    ['a'.repeat(31), 'dai hon 30 ky tu'],
    ['An-Nguyen', 'co chu hoa'],
    ['an nguyen', 'co dau cach'],
    ['nguyễn', 'co dau tieng Viet'],
    ['an@nguyen', 'co ky tu dac biet'],
    ['-an', 'bat dau bang gach ngang'],
    ['an-', 'ket thuc bang gach ngang'],
    ['', 'chuoi rong'],
  ])('tu choi "%s" (%s)', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('tu choi request rong - khong co gi de cap nhat', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('cho phep cap nhat tung truong mot', () => {
    expect(updateProfileSchema.safeParse({ bio: 'Xin chao' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ displayName: 'An' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ username: 'an-nguyen' }).success).toBe(true);
  });

  it('phan biet null (xoa gia tri) voi khong gui (giu nguyen)', () => {
    const cleared = updateProfileSchema.parse({ bio: null });
    expect(cleared).toHaveProperty('bio', null);

    const untouched = updateProfileSchema.parse({ displayName: 'An' });
    expect(untouched).not.toHaveProperty('bio');
  });

  it('cat khoang trang thua o hai dau', () => {
    expect(updateProfileSchema.parse({ displayName: '  An Nguyen  ' })).toEqual({
      displayName: 'An Nguyen',
    });
  });

  it('tu choi bio dai qua 280 ky tu', () => {
    expect(updateProfileSchema.safeParse({ bio: 'x'.repeat(281) }).success).toBe(false);
  });

  it('tu choi avatarUrl khong phai URL', () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: 'khong-phai-url' }).success).toBe(false);
    expect(
      updateProfileSchema.safeParse({ avatarUrl: 'https://example.com/a.png' }).success,
    ).toBe(true);
  });
});
