import { describe, expect, it } from 'vitest';
import {
  createFolderSchema,
  updateFolderSchema,
  folderSummarySchema,
} from './folder';

describe('createFolderSchema', () => {
  it('tu choi ten thu muc rong', () => {
    expect(createFolderSchema.safeParse({ name: '' }).success).toBe(false);
    expect(createFolderSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('tu choi ten thu muc qua 80 ky tu', () => {
    expect(createFolderSchema.safeParse({ name: 'a'.repeat(81) }).success).toBe(false);
  });

  it('chap nhan ten thu muc hop le va mo ta tuy chon', () => {
    const valid = createFolderSchema.parse({
      name: 'Từ vựng JLPT N3',
      description: 'Gom các bộ thẻ ôn tập JLPT',
    });
    expect(valid.name).toBe('Từ vựng JLPT N3');
    expect(valid.description).toBe('Gom các bộ thẻ ôn tập JLPT');
  });
});

describe('updateFolderSchema', () => {
  it('tu choi object rong', () => {
    expect(updateFolderSchema.safeParse({}).success).toBe(false);
  });

  it('chap nhan cap nhat 1 truong', () => {
    expect(updateFolderSchema.safeParse({ name: 'Tên mới' }).success).toBe(true);
  });
});

describe('folderSummarySchema', () => {
  it('validate dung dinh dang folder summary', () => {
    const raw = {
      id: '11111111-1111-4111-8111-111111111111',
      ownerId: '22222222-2222-4222-8222-222222222222',
      name: 'Tiếng Anh Giao Tiếp',
      description: null,
      setCount: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(folderSummarySchema.safeParse(raw).success).toBe(true);
  });
});

