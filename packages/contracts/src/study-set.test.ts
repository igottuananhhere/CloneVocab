import { describe, expect, it } from 'vitest';
import {
  createStudySetSchema,
  listStudySetsQuerySchema,
  updateStudySetSchema,
} from './study-set';

describe('createStudySetSchema', () => {
  it('tu choi khong co tieu de', () => {
    expect(
      createStudySetSchema.safeParse({ flashcards: [{ term: 'a', definition: 'b' }] }).success,
    ).toBe(false);
  });

  it('tu choi bo the khong co the nao', () => {
    expect(
      createStudySetSchema.safeParse({ title: 'Bo the test', flashcards: [] }).success,
    ).toBe(false);
  });

  it('mac dinh visibility la PRIVATE va language la vi', () => {
    const parsed = createStudySetSchema.parse({
      title: 'Bo the test',
      flashcards: [{ term: 'a', definition: 'b' }],
    });
    expect(parsed.visibility).toBe('PRIVATE');
    expect(parsed.language).toBe('vi');
  });
});

describe('updateStudySetSchema', () => {
  it('tu choi object rong', () => {
    expect(updateStudySetSchema.safeParse({}).success).toBe(false);
  });

  it('chap nhan cap nhat 1 truong', () => {
    expect(updateStudySetSchema.safeParse({ title: 'Tieu de moi' }).success).toBe(true);
  });
});

describe('listStudySetsQuerySchema', () => {
  it('ap dung gia tri mac dinh cho page, limit va sort', () => {
    const parsed = listStudySetsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(12);
    expect(parsed.sort).toBe('latest');
  });

  it('chuyen doi chuoi so thanh number cho page va limit', () => {
    const parsed = listStudySetsQuerySchema.parse({ page: '2', limit: '24' });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(24);
  });

  it('tu choi sort khong hop le', () => {
    expect(listStudySetsQuerySchema.safeParse({ sort: 'invalid' }).success).toBe(false);
  });
});

