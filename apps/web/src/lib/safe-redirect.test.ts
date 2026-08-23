import { describe, expect, it } from 'vitest';
import { DEFAULT_REDIRECT, resolveSafeNext } from './safe-redirect';

describe('resolveSafeNext', () => {
  it.each([
    '/dashboard',
    '/settings',
    '/sets/abc-123',
    '/u/an-nguyen',
    '/explore?q=ielts',
    '/sets/1#the-3',
  ])('giu nguyen duong dan noi bo "%s"', (value) => {
    expect(resolveSafeNext(value)).toBe(value);
  });

  it.each([
    ['https://trang-gia-mao.example', 'URL tuyet doi'],
    ['http://trang-gia-mao.example', 'URL tuyet doi khong ma hoa'],
    ['//trang-gia-mao.example', 'URL giao thuc tuong doi'],
    ['/\\trang-gia-mao.example', 'gach cheo nguoc bi trinh duyet hieu nhu //'],
    ['javascript:alert(1)', 'giao thuc javascript'],
    ['dashboard', 'duong dan tuong doi'],
    ['/dashboard\nLocation: https://trang-gia-mao.example', 'chen xuong dong'],
    ['/dashboard\tx', 'chen tab'],
  ])('chan "%s" (%s)', (value) => {
    expect(resolveSafeNext(value)).toBe(DEFAULT_REDIRECT);
  });

  it.each([null, undefined, ''])('tra ve mac dinh khi khong co gia tri (%s)', (value) => {
    expect(resolveSafeNext(value)).toBe(DEFAULT_REDIRECT);
  });
});
