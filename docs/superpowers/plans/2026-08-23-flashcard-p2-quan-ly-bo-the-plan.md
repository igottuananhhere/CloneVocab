# Thebai — Giai đoạn 2: Quản lý bộ thẻ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến schema đã có (StudySet, Flashcard, Folder, FolderStudySet, SavedSet, ContentReport) thành tính năng dùng được: CRUD bộ thẻ, upload ảnh, Explore + tìm kiếm, folder, lưu bộ thẻ, báo cáo — cả backend NestJS và giao diện thật nối vào các trang placeholder đã có.

**Architecture:** Một `StudySetsController` duy nhất (base path `/study-sets`) điều phối bốn service tách biệt theo trách nhiệm (`StudySetsService`, `FlashcardsService`, `SavedSetsService`, `ReportsService`), dùng chung hai hàm kiểm tra quyền thuần (`assertStudySetVisible`/`assertStudySetOwner`). `FoldersController`/`FoldersService` riêng. Ảnh đi qua signed URL do NestJS cấp, trình duyệt tự upload thẳng lên Supabase Storage. Frontend: parser dán nhanh và nén ảnh là hàm thuần (test được phần đầu, không test được phần sau — đã ghi rõ trong spec), form tạo/sửa bộ thẻ dùng chung một component, kéo-thả bằng dnd-kit.

**Tech Stack:** NestJS 11, Prisma 6, Zod (contracts dùng chung), Next.js 15 App Router, `@supabase/supabase-js` (mới thêm ở apps/api để tạo signed URL), `@dnd-kit/core` + `@dnd-kit/sortable` (mới thêm ở apps/web để kéo-thả).

Tham chiếu: [spec Giai đoạn 2](../specs/2026-08-23-flashcard-p2-quan-ly-bo-the-design.md), [spec Giai đoạn 1](../specs/2026-08-23-flashcard-p1-nen-mong-design.md).

---

## Quy ước dùng lại từ Giai đoạn 1 (không lặp lại chi tiết trong mỗi task)

- `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`) dùng cho `@Body`, `@Param`, `@Query` — nhận schema Zod, trả 400 kèm `details` khi sai.
- `@Public()` decorator mở route không cần đăng nhập; mặc định mọi route đều yêu cầu token.
- `@CurrentUser()` lấy `AuthenticatedUser | undefined` đã được `SupabaseAuthGuard` giải mã.
- `PrismaService` (`apps/api/src/prisma/prisma.service.ts`) inject qua constructor, dùng `this.prisma.client.<model>`.
- `AllExceptionsFilter` tự đổi mã lỗi Prisma P2002/P2025/P2003 sang HTTP status đúng nghĩa — không cần tự try/catch những mã đó trong service.
- Test service theo mẫu `apps/api/src/profiles/profiles.service.spec.ts`: mock `PrismaService` bằng object `{ client: { <model>: { ...vi.fn() } } }`, không cần NestJS TestingModule đầy đủ.
- Web: `apiServer` (Server Component, tự đính token từ cookie), `apiBrowser` (Client Component). `ApiRequestError` có `.status` và `.fieldError(field)`.
- `Field`/`Input`/`Textarea`/`Button`/`Card`/`Alert` đã có ở `apps/web/src/components/ui/`.
- **Luôn dùng `cn(buttonVariants({...}), 'class-them')` khi cần thêm class vào button — KHÔNG truyền `className` thẳng vào `buttonVariants({...})`, `cva()` âm thầm bỏ qua key đó** (lỗi đã gặp hai lần ở Giai đoạn 1).

---

## Phase A — Nền tảng: contracts, Supabase Storage, Supabase admin client

### Task 1: Thêm contracts cho StudySet, Flashcard, Explore query

**Files:**
- Modify: `packages/contracts/src/enums.ts`
- Create: `packages/contracts/src/study-set.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/study-set.test.ts`

- [ ] **Step 1: Thêm `reportReasonSchema` vào enums.ts**

Thêm vào `packages/contracts/src/enums.ts`, ngay sau `visibilitySchema`:

```ts
export const reportReasonSchema = z.enum([
  'SPAM',
  'INAPPROPRIATE',
  'COPYRIGHT',
  'MISINFORMATION',
  'OTHER',
]);
export type ReportReason = z.infer<typeof reportReasonSchema>;
```

- [ ] **Step 2: Viết test trước cho study-set.ts**

Tạo `packages/contracts/src/study-set.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createStudySetSchema,
  listStudySetsQuerySchema,
  replaceFlashcardsSchema,
  updateStudySetSchema,
} from './study-set';

describe('replaceFlashcardsSchema', () => {
  it('tu choi mang rong - phai co it nhat 1 the', () => {
    expect(replaceFlashcardsSchema.safeParse([]).success).toBe(false);
  });

  it('tu choi the co term hoac definition rong', () => {
    expect(
      replaceFlashcardsSchema.safeParse([{ term: '', definition: 'x' }]).success,
    ).toBe(false);
    expect(
      replaceFlashcardsSchema.safeParse([{ term: 'x', definition: '' }]).success,
    ).toBe(false);
  });

  it('chap nhan the co id (sua) va the khong co id (moi)', () => {
    const result = replaceFlashcardsSchema.safeParse([
      { id: '11111111-1111-4111-8111-111111111111', term: 'a', definition: 'b' },
      { term: 'c', definition: 'd' },
    ]);
    expect(result.success).toBe(true);
  });
});

describe('createStudySetSchema', () => {
  it('tu choi khong co tieu de', () => {
    expect(
      createStudySetSchema.safeParse({ flashcards: [{ term: 'a', definition: 'b' }] }).success,
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

  it('tu choi khi khong co the nao', () => {
    expect(
      createStudySetSchema.safeParse({ title: 'Bo the test', flashcards: [] }).success,
    ).toBe(false);
  });
});

describe('updateStudySetSchema', () => {
  it('tu choi request rong', () => {
    expect(updateStudySetSchema.safeParse({}).success).toBe(false);
  });

  it('cho phep sua tung truong mot, khong doi flashcards', () => {
    expect(updateStudySetSchema.safeParse({ title: 'Ten moi' }).success).toBe(true);
  });
});

describe('listStudySetsQuerySchema', () => {
  it('gia tri mac dinh: khong mine, sort newest, page 1, pageSize 20', () => {
    const parsed = listStudySetsQuerySchema.parse({});
    expect(parsed).toMatchObject({ mine: false, sort: 'newest', page: 1, pageSize: 20 });
  });

  it('chuyen dung chuoi query "mine=true" thanh boolean true, khong dung z.coerce.boolean', () => {
    // z.coerce.boolean() la mot cai bay: Boolean("false") === true. Test nay khoa lai
    // hanh vi dung: chuoi "false" phai thanh false, khong phai true.
    expect(listStudySetsQuerySchema.parse({ mine: 'false' }).mine).toBe(false);
    expect(listStudySetsQuerySchema.parse({ mine: 'true' }).mine).toBe(true);
  });

  it('page/pageSize duoc coerce tu chuoi query thanh so', () => {
    const parsed = listStudySetsQuerySchema.parse({ page: '3', pageSize: '50' });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
  });

  it('tu choi sort khong hop le', () => {
    expect(listStudySetsQuerySchema.safeParse({ sort: 'khong-hop-le' }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL vì chưa có file study-set.ts**

Run: `pnpm --filter @flashcard/contracts run test`
Expected: FAIL với lỗi `Cannot find module './study-set'`

- [ ] **Step 4: Viết `packages/contracts/src/study-set.ts`**

```ts
import { z } from 'zod';
import { visibilitySchema } from './enums';

export const flashcardInputSchema = z.object({
  id: z.string().uuid().optional(),
  term: z.string().trim().min(1, 'Thẻ phải có thuật ngữ').max(500, 'Thuật ngữ tối đa 500 ký tự'),
  definition: z
    .string()
    .trim()
    .min(1, 'Thẻ phải có định nghĩa')
    .max(2000, 'Định nghĩa tối đa 2000 ký tự'),
  imagePath: z.string().trim().max(500).nullable().optional(),
});
export type FlashcardInput = z.infer<typeof flashcardInputSchema>;

export const flashcardSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  definition: z.string(),
  imagePath: z.string().nullable(),
  position: z.number().int(),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const replaceFlashcardsSchema = z
  .array(flashcardInputSchema)
  .min(1, 'Bộ thẻ phải có ít nhất 1 thẻ');
export type ReplaceFlashcardsInput = z.infer<typeof replaceFlashcardsSchema>;

export const createStudySetSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(120, 'Tiêu đề tối đa 120 ký tự'),
  description: z.string().trim().max(1000).nullable().optional(),
  subject: z.string().trim().max(60).nullable().optional(),
  language: z.string().trim().min(2).max(10).default('vi'),
  visibility: visibilitySchema.default('PRIVATE'),
  flashcards: replaceFlashcardsSchema,
});
export type CreateStudySetInput = z.infer<typeof createStudySetSchema>;

export const updateStudySetSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    subject: z.string().trim().max(60).nullable().optional(),
    language: z.string().trim().min(2).max(10).optional(),
    visibility: visibilitySchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Phải cung cấp ít nhất một trường để cập nhật',
  });
export type UpdateStudySetInput = z.infer<typeof updateStudySetSchema>;

const sortSchema = z.enum(['newest', 'popular']);
export type StudySetSort = z.infer<typeof sortSchema>;

/**
 * `mine`/`saved` la chuoi "true"/"false" tren query string, KHONG dung z.coerce.boolean():
 * Boolean("false") === true trong JS, nen z.coerce.boolean() se hieu "false" thanh true.
 * Dung z.enum + transform de dam bao dung nghia.
 */
const queryBooleanSchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true');

export const listStudySetsQuerySchema = z.object({
  mine: queryBooleanSchema,
  saved: queryBooleanSchema,
  q: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(60).optional(),
  sort: sortSchema.optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListStudySetsQuery = z.infer<typeof listStudySetsQuerySchema>;

export const studySetOwnerSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
});

export const studySetSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  subject: z.string().nullable(),
  language: z.string(),
  visibility: visibilitySchema,
  cardCount: z.number().int(),
  viewCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  owner: studySetOwnerSchema,
});
export type StudySetSummary = z.infer<typeof studySetSummarySchema>;

export const studySetDetailSchema = studySetSummarySchema.extend({
  flashcards: z.array(flashcardSchema),
});
export type StudySetDetail = z.infer<typeof studySetDetailSchema>;

export const paginatedStudySetsSchema = z.object({
  items: z.array(studySetSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PaginatedStudySets = z.infer<typeof paginatedStudySetsSchema>;
```

- [ ] **Step 5: Thêm export vào `packages/contracts/src/index.ts`**

```ts
export * from './common';
export * from './enums';
export * from './profile';
export * from './study-set';
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/contracts run test`
Expected: PASS — 19 test cũ + test mới của study-set.ts đều xanh.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/enums.ts packages/contracts/src/study-set.ts packages/contracts/src/study-set.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): them schema StudySet, Flashcard, Explore query"
```

---

### Task 2: Thêm contracts cho Folder, Report, Upload

**Files:**
- Create: `packages/contracts/src/folder.ts`
- Create: `packages/contracts/src/report.ts`
- Create: `packages/contracts/src/upload.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/folder.test.ts`

- [ ] **Step 1: Viết test trước cho folder.ts**

Tạo `packages/contracts/src/folder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFolderSchema, replaceFolderStudySetsSchema, updateFolderSchema } from './folder';

describe('createFolderSchema', () => {
  it('tu choi ten rong', () => {
    expect(createFolderSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('chap nhan ten hop le, description tuy chon', () => {
    expect(createFolderSchema.safeParse({ name: 'Từ vựng IELTS' }).success).toBe(true);
  });
});

describe('updateFolderSchema', () => {
  it('tu choi request rong', () => {
    expect(updateFolderSchema.safeParse({}).success).toBe(false);
  });
});

describe('replaceFolderStudySetsSchema', () => {
  it('cho phep mang rong - lam trong folder', () => {
    expect(replaceFolderStudySetsSchema.safeParse([]).success).toBe(true);
  });

  it('tu choi id khong phai uuid', () => {
    expect(replaceFolderStudySetsSchema.safeParse(['khong-phai-uuid']).success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/contracts run test`
Expected: FAIL — `Cannot find module './folder'`

- [ ] **Step 3: Viết `packages/contracts/src/folder.ts`**

```ts
import { z } from 'zod';
import { studySetSummarySchema } from './study-set';

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên thư mục').max(80, 'Tên thư mục tối đa 80 ký tự'),
  description: z.string().trim().max(500).nullable().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Phải cung cấp ít nhất một trường để cập nhật',
  });
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

/** Mang rong hop le - lam trong folder la mot hanh dong binh thuong, khong phai loi. */
export const replaceFolderStudySetsSchema = z.array(z.string().uuid());
export type ReplaceFolderStudySetsInput = z.infer<typeof replaceFolderStudySetsSchema>;

export const folderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Folder = z.infer<typeof folderSchema>;

export const folderDetailSchema = folderSchema.extend({
  studySets: z.array(studySetSummarySchema),
});
export type FolderDetail = z.infer<typeof folderDetailSchema>;
```

- [ ] **Step 4: Viết `packages/contracts/src/report.ts`**

```ts
import { z } from 'zod';
import { reportReasonSchema } from './enums';

export const createReportSchema = z.object({
  reason: reportReasonSchema,
  note: z.string().trim().max(1000).nullable().optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;
```

- [ ] **Step 5: Viết `packages/contracts/src/upload.ts`**

```ts
import { z } from 'zod';

/** Danh sach loai anh duoc chap nhan. Dung lai o ca client (chon file) va server (whitelist). */
export const ALLOWED_IMAGE_CONTENT_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;

export const requestUploadUrlSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_CONTENT_TYPES),
});
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;

export const uploadUrlResultSchema = z.object({
  path: z.string(),
  token: z.string(),
});
export type UploadUrlResult = z.infer<typeof uploadUrlResultSchema>;
```

- [ ] **Step 6: Thêm export vào `packages/contracts/src/index.ts`**

```ts
export * from './common';
export * from './enums';
export * from './folder';
export * from './profile';
export * from './report';
export * from './study-set';
export * from './upload';
```

- [ ] **Step 7: Chạy test, xác nhận PASS, rồi build package**

Run: `pnpm --filter @flashcard/contracts run test && pnpm --filter @flashcard/contracts run build`
Expected: test PASS, build không lỗi TypeScript.

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/src/folder.ts packages/contracts/src/folder.test.ts packages/contracts/src/report.ts packages/contracts/src/upload.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): them schema Folder, Report, Upload"
```

---

### Task 3: Khai báo bucket Supabase Storage cho ảnh thẻ

**Files:**
- Modify: `supabase/config.toml`

- [ ] **Step 1: Thêm khối `[storage.buckets."flashcard-images"]`**

Mở `supabase/config.toml`, tìm khối `[storage]` (đã có `enabled = true` và `file_size_limit = "50MiB"` từ Giai đoạn 1). Thêm ngay sau khối `[storage]`, trước dòng `[storage.s3_protocol]`:

```toml
[storage.buckets."flashcard-images"]
public = true
file_size_limit = "5MiB"
allowed_mime_types = ["image/webp", "image/jpeg", "image/png"]
```

Public-read theo đúng quyết định thiết kế mục 2.2 của spec: đường dẫn là UUID ngẫu nhiên do server sinh, không ai dò ra được nếu không có link.

- [ ] **Step 2: Khởi động lại Supabase để nạp cấu hình mới**

Run: `pnpm supabase:stop && pnpm supabase:start`
Expected: log hiện `Applying storage migration` hoặc tương đương, không có lỗi.

- [ ] **Step 3: Xác nhận bucket tồn tại**

Run:
```bash
ANON=$(grep -oP '(?<=^SUPABASE_ANON_KEY=")[^"]+' .env)
curl -s "http://127.0.0.1:54321/storage/v1/bucket/flashcard-images" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```
Expected: JSON trả về có `"id":"flashcard-images"` và `"public":true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml
git commit -m "feat(supabase): khai bao bucket flashcard-images public-read 5MB"
```

---

### Task 4: Thêm `@supabase/supabase-js` vào apps/api và tạo `SupabaseAdminService`

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/supabase/supabase-admin.service.ts`
- Create: `apps/api/src/supabase/supabase.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Thêm dependency**

Trong `apps/api/package.json`, thêm vào `dependencies` (giữ thứ tự alphabet như các dòng khác):

```json
    "@supabase/supabase-js": "^2.47.10",
```

Run: `pnpm install`
Expected: cài xong, không lỗi.

- [ ] **Step 2: Viết `apps/api/src/supabase/supabase-admin.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase dung service-role key - bo qua RLS, chi goi tu server. Dung cho
 * tao signed upload URL (Storage) va cac tac vu admin khac sau nay.
 */
@Injectable()
export class SupabaseAdminService {
  readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
}
```

- [ ] **Step 3: Viết `apps/api/src/supabase/supabase.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { SupabaseAdminService } from './supabase-admin.service';

@Global()
@Module({
  providers: [SupabaseAdminService],
  exports: [SupabaseAdminService],
})
export class SupabaseModule {}
```

- [ ] **Step 4: Đăng ký module trong `apps/api/src/app.module.ts`**

Mở file, thêm import và đưa vào mảng `imports` (đặt sau `PrismaModule`, trước `AuthModule`):

```ts
import { SupabaseModule } from './supabase/supabase.module';
```

```ts
    PrismaModule,
    SupabaseModule,
    AuthModule,
```

- [ ] **Step 5: Build và xác nhận không lỗi**

Run: `pnpm --filter @flashcard/api run build`
Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/src/supabase apps/api/src/app.module.ts pnpm-lock.yaml
git commit -m "feat(api): them SupabaseAdminService dung service-role key"
```

---

## Phase B — StudySets: quy tắc quyền + CRUD

### Task 5: Hàm kiểm tra quyền thuần `study-set-access.ts`

**Files:**
- Create: `apps/api/src/study-sets/study-set-access.ts`
- Test: `apps/api/src/study-sets/study-set-access.spec.ts`

- [ ] **Step 1: Viết test trước**

Tạo `apps/api/src/study-sets/study-set-access.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { assertStudySetOwner, assertStudySetVisible } from './study-set-access';

const owner = { ownerId: 'user-1', visibility: 'PRIVATE' as const };
const publicSet = { ownerId: 'user-1', visibility: 'PUBLIC' as const };
const unlistedSet = { ownerId: 'user-1', visibility: 'UNLISTED' as const };

describe('assertStudySetVisible', () => {
  it('bo the PRIVATE: chu so huu xem duoc', () => {
    expect(() => assertStudySetVisible(owner, 'user-1')).not.toThrow();
  });

  it('bo the PRIVATE: nguoi khac bi 404, khong phai 403 - khong tiet lo su ton tai', () => {
    expect(() => assertStudySetVisible(owner, 'user-2')).toThrow(NotFoundException);
  });

  it('bo the PRIVATE: khach chua dang nhap (userId undefined) cung bi 404', () => {
    expect(() => assertStudySetVisible(owner, undefined)).toThrow(NotFoundException);
  });

  it('bo the PUBLIC va UNLISTED: ai xem cung duoc', () => {
    expect(() => assertStudySetVisible(publicSet, undefined)).not.toThrow();
    expect(() => assertStudySetVisible(unlistedSet, 'nguoi-la')).not.toThrow();
  });
});

describe('assertStudySetOwner', () => {
  it('chu so huu thi qua', () => {
    expect(() => assertStudySetOwner(publicSet, 'user-1')).not.toThrow();
  });

  it('khong phai chu so huu tren bo the PUBLIC/UNLISTED bi 403 - khong phai 404', () => {
    // Bo the nay ai cung thay duoc nen khong can giau su ton tai, chi chan hanh dong.
    expect(() => assertStudySetOwner(publicSet, 'nguoi-khac')).toThrow(ForbiddenException);
  });

  it('khach chua dang nhap cung bi 403 khi thu sua bo the cong khai', () => {
    expect(() => assertStudySetOwner(publicSet, undefined)).toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — `Cannot find module './study-set-access'`

- [ ] **Step 3: Viết `apps/api/src/study-sets/study-set-access.ts`**

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Visibility } from '@flashcard/db';

type OwnedVisible = { ownerId: string; visibility: Visibility };

/**
 * Quy tac hien thi/quyen dung chung cho moi thao tac tren StudySet (xem muc 2.3 cua
 * spec Giai doan 2). Goi CA HAI ham nay theo dung thu tu cho moi hanh dong sua/xoa:
 *   1. assertStudySetVisible truoc - bo the PRIVATE khong phai cua minh thi bao 404,
 *      khong duoc bao 403 vi se lo ra la bo the co ton tai.
 *   2. assertStudySetOwner sau - den day thi bo the da chac la nhin thay duoc
 *      (PUBLIC/UNLISTED, hoac PRIVATE cua chinh minh), nen khong phai owner chi can
 *      403 la du, khong con gi phai giau.
 */
export function assertStudySetVisible(set: OwnedVisible, viewerId?: string): void {
  if (set.visibility === 'PRIVATE' && set.ownerId !== viewerId) {
    throw new NotFoundException('Không tìm thấy bộ thẻ.');
  }
}

export function assertStudySetOwner(set: OwnedVisible, viewerId?: string): void {
  if (set.ownerId !== viewerId) {
    throw new ForbiddenException('Bạn không có quyền thực hiện hành động này.');
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/api run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/study-sets/study-set-access.ts apps/api/src/study-sets/study-set-access.spec.ts
git commit -m "feat(api): ham kiem tra quyen thuan cho StudySet (403 vs 404)"
```

---

### Task 6: `StudySetsService` — tạo, đọc theo id (kèm tăng view_count), xóa

**Files:**
- Create: `apps/api/src/study-sets/study-set.mapper.ts`
- Create: `apps/api/src/study-sets/study-sets.service.ts`
- Test: `apps/api/src/study-sets/study-sets.service.spec.ts`

- [ ] **Step 1: Viết mapper thuần trước (không cần test riêng — dùng qua test service)**

Tạo `apps/api/src/study-sets/study-set.mapper.ts`:

```ts
import type { Prisma } from '@flashcard/db';
import type { Flashcard, StudySetDetail, StudySetSummary } from '@flashcard/contracts';

export type StudySetWithOwner = Prisma.StudySetGetPayload<{ include: { owner: true } }>;
export type StudySetWithOwnerAndCards = Prisma.StudySetGetPayload<{
  include: { owner: true; flashcards: true };
}>;

export function toStudySetSummary(set: StudySetWithOwner): StudySetSummary {
  return {
    id: set.id,
    title: set.title,
    description: set.description,
    subject: set.subject,
    language: set.language,
    visibility: set.visibility,
    cardCount: set.cardCount,
    viewCount: set.viewCount,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
    owner: {
      id: set.owner.id,
      username: set.owner.username,
      displayName: set.owner.displayName,
    },
  };
}

export function toFlashcard(card: {
  id: string;
  term: string;
  definition: string;
  imagePath: string | null;
  position: number;
}): Flashcard {
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    imagePath: card.imagePath,
    position: card.position,
  };
}

export function toStudySetDetail(set: StudySetWithOwnerAndCards): StudySetDetail {
  return {
    ...toStudySetSummary(set),
    flashcards: [...set.flashcards].sort((a, b) => a.position - b.position).map(toFlashcard),
  };
}
```

- [ ] **Step 2: Viết test trước cho StudySetsService**

Tạo `apps/api/src/study-sets/study-sets.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudySetsService } from './study-sets.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const owner: AuthenticatedUser = { id: 'user-1', email: 'a@example.com', role: 'authenticated' };
const stranger: AuthenticatedUser = { id: 'user-2', email: 'b@example.com', role: 'authenticated' };

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'set-1',
    ownerId: 'user-1',
    title: 'Bộ thẻ mẫu',
    description: null,
    subject: null,
    language: 'vi',
    visibility: 'PRIVATE',
    cardCount: 1,
    viewCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    owner: { id: 'user-1', username: 'an-nguyen', displayName: 'An Nguyễn' },
    flashcards: [
      { id: 'card-1', term: 'a', definition: 'b', imagePath: null, position: 0 },
    ],
    ...overrides,
  };
}

function makeService(studySetDelegate: Record<string, unknown>): StudySetsService {
  const prisma = { client: { studySet: studySetDelegate } } as unknown as PrismaService;
  return new StudySetsService(prisma);
}

describe('StudySetsService.create', () => {
  it('tao bo the voi flashcards theo dung thu tu position', async () => {
    const create = vi.fn().mockResolvedValue(baseRow());
    const service = makeService({ create });

    await service.create(owner, {
      title: 'Bộ thẻ mẫu',
      description: null,
      subject: null,
      language: 'vi',
      visibility: 'PRIVATE',
      flashcards: [{ term: 'a', definition: 'b' }],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'user-1',
          flashcards: {
            create: [{ term: 'a', definition: 'b', imagePath: null, position: 0 }],
          },
        }),
      }),
    );
  });
});

describe('StudySetsService.getById', () => {
  it('404 khi bo the PRIVATE va nguoi xem khong phai owner', async () => {
    const findUnique = vi.fn().mockResolvedValue(baseRow());
    const service = makeService({ findUnique, update: vi.fn() });

    await expect(service.getById('set-1', stranger)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404 khi khong ton tai', async () => {
    const service = makeService({ findUnique: vi.fn().mockResolvedValue(null) });

    await expect(service.getById('khong-ton-tai', owner)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('tang view_count khi nguoi xem khong phai owner, khong tang khi la owner', async () => {
    const update = vi.fn().mockResolvedValue({});
    const findUnique = vi.fn().mockResolvedValue(baseRow({ visibility: 'PUBLIC' }));
    const service = makeService({ findUnique, update });

    await service.getById('set-1', stranger);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'set-1' },
      data: { viewCount: { increment: 1 } },
    });

    update.mockClear();
    await service.getById('set-1', owner);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('StudySetsService.remove', () => {
  it('404 khi bo the PRIVATE khong phai cua minh', async () => {
    const service = makeService({ findUnique: vi.fn().mockResolvedValue(baseRow()) });

    await expect(service.remove(stranger, 'set-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403 khi bo the PUBLIC nhung khong phai owner', async () => {
    const service = makeService({
      findUnique: vi.fn().mockResolvedValue(baseRow({ visibility: 'PUBLIC' })),
    });

    await expect(service.remove(stranger, 'set-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('xoa thanh cong khi la owner', async () => {
    const deleteFn = vi.fn().mockResolvedValue({});
    const service = makeService({
      findUnique: vi.fn().mockResolvedValue(baseRow()),
      delete: deleteFn,
    });

    await service.remove(owner, 'set-1');
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'set-1' } });
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — `Cannot find module './study-sets.service'`

- [ ] **Step 4: Viết `apps/api/src/study-sets/study-sets.service.ts` (phần create/getById/update/remove — chưa có `list`, thêm ở Task 7)**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateStudySetInput,
  StudySetDetail,
  UpdateStudySetInput,
} from '@flashcard/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { assertStudySetOwner, assertStudySetVisible } from './study-set-access';
import { toStudySetDetail } from './study-set.mapper';

const DETAIL_INCLUDE = { owner: true, flashcards: true } as const;

@Injectable()
export class StudySetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, input: CreateStudySetInput): Promise<StudySetDetail> {
    const created = await this.prisma.client.studySet.create({
      data: {
        ownerId: user.id,
        title: input.title,
        description: input.description ?? null,
        subject: input.subject ?? null,
        language: input.language,
        visibility: input.visibility,
        flashcards: {
          create: input.flashcards.map((card, index) => ({
            term: card.term,
            definition: card.definition,
            imagePath: card.imagePath ?? null,
            position: index,
          })),
        },
      },
      include: DETAIL_INCLUDE,
    });

    return toStudySetDetail(created);
  }

  async getById(id: string, user?: AuthenticatedUser): Promise<StudySetDetail> {
    const set = await this.prisma.client.studySet.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!set) throw new NotFoundException('Không tìm thấy bộ thẻ.');

    assertStudySetVisible(set, user?.id);

    if (set.ownerId !== user?.id) {
      // Khong await: khong de mot lan tang view_count lam cham response tra ve nguoi
      // xem. Loi o day (mang chap chon...) khong nen lam hong ca request doc.
      this.prisma.client.studySet
        .update({ where: { id }, data: { viewCount: { increment: 1 } } })
        .catch(() => undefined);
    }

    return toStudySetDetail(set);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    input: UpdateStudySetInput,
  ): Promise<StudySetDetail> {
    const existing = await this.findOwnedOrThrow(user, id);

    const updated = await this.prisma.client.studySet.update({
      where: { id: existing.id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      },
      include: DETAIL_INCLUDE,
    });

    return toStudySetDetail(updated);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.findOwnedOrThrow(user, id);
    await this.prisma.client.studySet.delete({ where: { id: existing.id } });
  }

  /**
   * Dung chung cho moi thao tac sua/xoa: tim bo the, ap dung ca hai buoc kiem tra
   * quyen theo dung thu tu (xem study-set-access.ts), roi tra ve ban ghi da xac nhan
   * quyen so huu de tranh phai fetch lai.
   */
  private async findOwnedOrThrow(
    user: AuthenticatedUser,
    id: string,
  ): Promise<{ id: string; ownerId: string; visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED' }> {
    const existing = await this.prisma.client.studySet.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy bộ thẻ.');

    assertStudySetVisible(existing, user.id);
    assertStudySetOwner(existing, user.id);

    return existing;
  }
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/api run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/study-sets/study-set.mapper.ts apps/api/src/study-sets/study-sets.service.ts apps/api/src/study-sets/study-sets.service.spec.ts
git commit -m "feat(api): StudySetsService - tao, doc theo id, sua, xoa"
```

---

### Task 7: `StudySetsService.list` — "Bộ thẻ của tôi" + Explore (tìm kiếm/lọc/sắp/phân trang)

**Files:**
- Modify: `apps/api/src/study-sets/study-sets.service.ts`
- Modify: `apps/api/src/study-sets/study-sets.service.spec.ts`

- [ ] **Step 1: Thêm test trước cho `list`**

Thêm vào cuối `apps/api/src/study-sets/study-sets.service.spec.ts`:

```ts
describe('StudySetsService.list', () => {
  it('mine=true nhung chua dang nhap thi 401', async () => {
    const service = makeService({});

    await expect(
      service.list({ mine: true, saved: false, sort: 'newest', page: 1, pageSize: 20 }, undefined),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('mine=true: loc theo ownerId, khong loc visibility', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = makeService({ findMany, count });

    await service.list({ mine: true, saved: false, sort: 'newest', page: 1, pageSize: 20 }, owner);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'user-1' } }),
    );
  });

  it('mac dinh (khong mine): chi lay visibility PUBLIC', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = makeService({ findMany, count });

    await service.list(
      { mine: false, saved: false, sort: 'newest', page: 1, pageSize: 20 },
      undefined,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visibility: 'PUBLIC' } }),
    );
  });

  it('sort=popular sap theo viewCount giam dan, newest sap theo createdAt giam dan', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = makeService({ findMany, count: vi.fn().mockResolvedValue(0) });

    await service.list(
      { mine: false, saved: false, sort: 'popular', page: 1, pageSize: 20 },
      undefined,
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { viewCount: 'desc' } }),
    );

    await service.list(
      { mine: false, saved: false, sort: 'newest', page: 1, pageSize: 20 },
      undefined,
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('tinh dung totalPages tu total va pageSize', async () => {
    const service = makeService({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(45),
    });

    const result = await service.list(
      { mine: false, saved: false, sort: 'newest', page: 1, pageSize: 20 },
      undefined,
    );
    expect(result.totalPages).toBe(3);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL vì `list` chưa tồn tại**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — `service.list is not a function`

- [ ] **Step 3: Thêm `list` vào `StudySetsService`**

Thêm `UnauthorizedException` vào import đầu file:

```ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type {
  CreateStudySetInput,
  ListStudySetsQuery,
  PaginatedStudySets,
  StudySetDetail,
  UpdateStudySetInput,
} from '@flashcard/contracts';
import type { Prisma } from '@flashcard/db';
```

Thêm import `toStudySetSummary` từ mapper:

```ts
import { toStudySetDetail, toStudySetSummary, type StudySetWithOwner } from './study-set.mapper';
```

Thêm các method sau vào cuối class `StudySetsService` (trước dấu `}` đóng class):

```ts
  async list(query: ListStudySetsQuery, user?: AuthenticatedUser): Promise<PaginatedStudySets> {
    if (query.mine) {
      if (!user) throw new UnauthorizedException('Yêu cầu này cần đăng nhập.');
      return this.listMine(user.id, query);
    }

    if (query.saved) {
      if (!user) throw new UnauthorizedException('Yêu cầu này cần đăng nhập.');
      return this.listSaved(user.id, query);
    }

    return this.listPublic(query);
  }

  private async listMine(
    ownerId: string,
    query: ListStudySetsQuery,
  ): Promise<PaginatedStudySets> {
    const where = { ownerId };

    const [items, total] = await Promise.all([
      this.prisma.client.studySet.findMany({
        where,
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.studySet.count({ where }),
    ]);

    return this.toPaginated(items, total, query);
  }

  private async listSaved(
    userId: string,
    query: ListStudySetsQuery,
  ): Promise<PaginatedStudySets> {
    const where = { userId };

    const [rows, total] = await Promise.all([
      this.prisma.client.savedSet.findMany({
        where,
        include: { studySet: { include: { owner: true } } },
        orderBy: { savedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.savedSet.count({ where }),
    ]);

    return this.toPaginated(rows.map((row) => row.studySet), total, query);
  }

  private async listPublic(query: ListStudySetsQuery): Promise<PaginatedStudySets> {
    const where: Prisma.StudySetWhereInput = { visibility: 'PUBLIC' };
    if (query.subject) where.subject = query.subject;

    if (query.q) {
      // websearch_to_tsquery an toan voi input tuy y: Prisma tham so hoa gia tri
      // truyen vao $queryRaw, khong co rui ro SQL injection.
      const matchingIds = await this.prisma.client.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM study_sets
        WHERE visibility = 'PUBLIC' AND search_vector @@ websearch_to_tsquery('simple', ${query.q})
      `;
      where.id = { in: matchingIds.map((row) => row.id) };
    }

    const orderBy: Prisma.StudySetOrderByWithRelationInput =
      query.sort === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.client.studySet.findMany({
        where,
        include: { owner: true },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.studySet.count({ where }),
    ]);

    return this.toPaginated(items, total, query);
  }

  private toPaginated(
    items: StudySetWithOwner[],
    total: number,
    query: ListStudySetsQuery,
  ): PaginatedStudySets {
    return {
      items: items.map(toStudySetSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/api run test`
Expected: PASS — toàn bộ test của `study-sets.service.spec.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/study-sets/study-sets.service.ts apps/api/src/study-sets/study-sets.service.spec.ts
git commit -m "feat(api): StudySetsService.list - bo the cua toi, da luu, Explore"
```

---

### Task 8: `FlashcardsService.replaceAll` — thay toàn bộ mảng thẻ

**Files:**
- Create: `apps/api/src/study-sets/flashcards.service.ts`
- Test: `apps/api/src/study-sets/flashcards.service.spec.ts`

- [ ] **Step 1: Viết test trước**

Tạo `apps/api/src/study-sets/flashcards.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const owner: AuthenticatedUser = { id: 'user-1', email: 'a@example.com', role: 'authenticated' };
const stranger: AuthenticatedUser = { id: 'user-2', email: 'b@example.com', role: 'authenticated' };

const studySetRow = { id: 'set-1', ownerId: 'user-1', visibility: 'PRIVATE' as const };

function makeService(overrides: {
  studySet?: Record<string, unknown>;
  flashcard?: Record<string, unknown>;
  transaction?: (fn: (tx: unknown) => unknown) => unknown;
}): FlashcardsService {
  const tx = {
    flashcard: {
      deleteMany: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockImplementation(({ where, data }) => ({ id: where.id, ...data })),
      create: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: `new-${data.position}`, ...data })),
    },
  };

  const prisma = {
    client: {
      studySet: { findUnique: vi.fn().mockResolvedValue(studySetRow), ...overrides.studySet },
      flashcard: { findMany: vi.fn().mockResolvedValue([]), ...overrides.flashcard },
      $transaction: overrides.transaction ?? ((fn: (tx: unknown) => unknown) => fn(tx)),
    },
  } as unknown as PrismaService;

  return new FlashcardsService(prisma);
}

describe('FlashcardsService.replaceAll', () => {
  it('404 khi bo the khong ton tai', async () => {
    const service = makeService({ studySet: { findUnique: vi.fn().mockResolvedValue(null) } });

    await expect(
      service.replaceAll(owner, 'set-1', [{ term: 'a', definition: 'b' }]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403 khi khong phai owner', async () => {
    const service = makeService({});

    await expect(
      service.replaceAll(stranger, 'set-1', [{ term: 'a', definition: 'b' }]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('400 khi mot the trong danh sach co id khong thuoc bo the nay', async () => {
    const service = makeService({
      flashcard: { findMany: vi.fn().mockResolvedValue([{ id: 'card-cua-set-khac' }]) },
    });

    await expect(
      service.replaceAll(owner, 'set-1', [
        { id: 'card-khong-ton-tai', term: 'a', definition: 'b' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('xoa the bi bo khoi mang, giu the co id, tao the moi khong co id', async () => {
    const flashcardFindMany = vi
      .fn()
      .mockResolvedValue([{ id: 'card-giu-lai' }, { id: 'card-bi-xoa' }]);
    const service = makeService({ flashcard: { findMany: flashcardFindMany } });

    const result = await service.replaceAll(owner, 'set-1', [
      { id: 'card-giu-lai', term: 'a-moi', definition: 'b-moi' },
      { term: 'c', definition: 'd' },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'card-giu-lai', position: 0 });
    expect(result[1]).toMatchObject({ position: 1 });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — `Cannot find module './flashcards.service'`

- [ ] **Step 3: Viết `apps/api/src/study-sets/flashcards.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Flashcard, ReplaceFlashcardsInput } from '@flashcard/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { assertStudySetOwner, assertStudySetVisible } from './study-set-access';
import { toFlashcard } from './study-set.mapper';

@Injectable()
export class FlashcardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Thay toan bo mang the cua mot bo the trong mot transaction: the co id -> sua,
   * khong co id -> tao moi, the cu khong con trong mang -> xoa. position gan lai
   * bang chinh index trong mang gui len. Xem muc 2.1 cua spec.
   */
  async replaceAll(
    user: AuthenticatedUser,
    studySetId: string,
    input: ReplaceFlashcardsInput,
  ): Promise<Flashcard[]> {
    const set = await this.prisma.client.studySet.findUnique({ where: { id: studySetId } });
    if (!set) throw new NotFoundException('Không tìm thấy bộ thẻ.');
    assertStudySetVisible(set, user.id);
    assertStudySetOwner(set, user.id);

    const existingCards = await this.prisma.client.flashcard.findMany({
      where: { studySetId },
      select: { id: true },
    });
    const existingIds = new Set(existingCards.map((card) => card.id));

    for (const card of input) {
      if (card.id && !existingIds.has(card.id)) {
        throw new BadRequestException('Một thẻ trong danh sách không thuộc bộ thẻ này.');
      }
    }

    const keepIds = new Set(input.filter((card) => card.id).map((card) => card.id as string));
    const idsToDelete = [...existingIds].filter((id) => !keepIds.has(id));

    const updated = await this.prisma.client.$transaction(async (tx) => {
      if (idsToDelete.length > 0) {
        await tx.flashcard.deleteMany({ where: { id: { in: idsToDelete } } });
      }

      const results: Array<{
        id: string;
        term: string;
        definition: string;
        imagePath: string | null;
        position: number;
      }> = [];

      for (let index = 0; index < input.length; index += 1) {
        const card = input[index];
        if (card.id) {
          results.push(
            await tx.flashcard.update({
              where: { id: card.id },
              data: {
                term: card.term,
                definition: card.definition,
                imagePath: card.imagePath ?? null,
                position: index,
              },
            }),
          );
        } else {
          results.push(
            await tx.flashcard.create({
              data: {
                studySetId,
                term: card.term,
                definition: card.definition,
                imagePath: card.imagePath ?? null,
                position: index,
              },
            }),
          );
        }
      }

      return results;
    });

    return updated.sort((a, b) => a.position - b.position).map(toFlashcard);
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/api run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/study-sets/flashcards.service.ts apps/api/src/study-sets/flashcards.service.spec.ts
git commit -m "feat(api): FlashcardsService.replaceAll - thay toan bo mang the"
```

---

### Task 9: `SavedSetsService` và `ReportsService`

**Files:**
- Create: `apps/api/src/study-sets/saved-sets.service.ts`
- Create: `apps/api/src/study-sets/reports.service.ts`
- Test: `apps/api/src/study-sets/saved-sets.service.spec.ts`
- Test: `apps/api/src/study-sets/reports.service.spec.ts`

- [ ] **Step 1: Viết test trước cho SavedSetsService**

Tạo `apps/api/src/study-sets/saved-sets.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SavedSetsService } from './saved-sets.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const user: AuthenticatedUser = { id: 'user-1', email: 'a@example.com', role: 'authenticated' };

function makeService(overrides: {
  studySet?: Record<string, unknown>;
  savedSet?: Record<string, unknown>;
}): SavedSetsService {
  const prisma = {
    client: {
      studySet: {
        findUnique: vi.fn().mockResolvedValue({ id: 'set-1', ownerId: 'owner', visibility: 'PUBLIC' }),
        ...overrides.studySet,
      },
      savedSet: { upsert: vi.fn(), deleteMany: vi.fn(), ...overrides.savedSet },
    },
  } as unknown as PrismaService;

  return new SavedSetsService(prisma);
}

describe('SavedSetsService.save', () => {
  it('404 khi bo the khong ton tai', async () => {
    const service = makeService({ studySet: { findUnique: vi.fn().mockResolvedValue(null) } });

    await expect(service.save(user, 'set-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upsert dong saved_sets - luu nhieu lan khong loi', async () => {
    const upsert = vi.fn();
    const service = makeService({ savedSet: { upsert } });

    await service.save(user, 'set-1');

    expect(upsert).toHaveBeenCalledWith({
      where: { userId_studySetId: { userId: 'user-1', studySetId: 'set-1' } },
      create: { userId: 'user-1', studySetId: 'set-1' },
      update: {},
    });
  });
});

describe('SavedSetsService.unsave', () => {
  it('xoa dong saved_sets, khong loi neu chua tung luu', async () => {
    const deleteMany = vi.fn();
    const service = makeService({ savedSet: { deleteMany } });

    await service.unsave(user, 'set-1');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', studySetId: 'set-1' },
    });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — thiếu module `saved-sets.service`.

- [ ] **Step 3: Viết `apps/api/src/study-sets/saved-sets.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { assertStudySetVisible } from './study-set-access';

@Injectable()
export class SavedSetsService {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: AuthenticatedUser, studySetId: string): Promise<void> {
    const set = await this.prisma.client.studySet.findUnique({ where: { id: studySetId } });
    if (!set) throw new NotFoundException('Không tìm thấy bộ thẻ.');
    assertStudySetVisible(set, user.id);

    await this.prisma.client.savedSet.upsert({
      where: { userId_studySetId: { userId: user.id, studySetId } },
      create: { userId: user.id, studySetId },
      update: {},
    });
  }

  async unsave(user: AuthenticatedUser, studySetId: string): Promise<void> {
    await this.prisma.client.savedSet.deleteMany({
      where: { userId: user.id, studySetId },
    });
  }
}
```

- [ ] **Step 4: Viết test trước cho ReportsService**

Tạo `apps/api/src/study-sets/reports.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const user: AuthenticatedUser = { id: 'user-1', email: 'a@example.com', role: 'authenticated' };

function makeService(overrides: {
  studySet?: Record<string, unknown>;
  contentReport?: Record<string, unknown>;
}): ReportsService {
  const prisma = {
    client: {
      studySet: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'set-1', ownerId: 'owner', visibility: 'PUBLIC' }),
        ...overrides.studySet,
      },
      contentReport: { create: vi.fn(), ...overrides.contentReport },
    },
  } as unknown as PrismaService;

  return new ReportsService(prisma);
}

describe('ReportsService.create', () => {
  it('404 khi bo the khong ton tai', async () => {
    const service = makeService({ studySet: { findUnique: vi.fn().mockResolvedValue(null) } });

    await expect(
      service.create(user, 'set-1', { reason: 'SPAM' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cho phep bao cao khi chua dang nhap - reporterId la null', async () => {
    const create = vi.fn();
    const service = makeService({ contentReport: { create } });

    await service.create(undefined, 'set-1', { reason: 'SPAM', note: 'test' });

    expect(create).toHaveBeenCalledWith({
      data: { studySetId: 'set-1', reporterId: null, reason: 'SPAM', note: 'test' },
    });
  });
});
```

- [ ] **Step 5: Viết `apps/api/src/study-sets/reports.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateReportInput } from '@flashcard/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { assertStudySetVisible } from './study-set-access';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ai cung bao cao duoc, ke ca chua dang nhap - reporterId thanh null. Van kiem tra
   * assertStudySetVisible: chi bao cao duoc noi dung ban duoc phep nhin thay, giu
   * cung mot the gioi quan voi phan quyen doc.
   */
  async create(
    user: AuthenticatedUser | undefined,
    studySetId: string,
    input: CreateReportInput,
  ): Promise<void> {
    const set = await this.prisma.client.studySet.findUnique({ where: { id: studySetId } });
    if (!set) throw new NotFoundException('Không tìm thấy bộ thẻ.');
    assertStudySetVisible(set, user?.id);

    await this.prisma.client.contentReport.create({
      data: {
        studySetId,
        reporterId: user?.id ?? null,
        reason: input.reason,
        note: input.note ?? null,
      },
    });
  }
}
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/api run test`
Expected: PASS — toàn bộ test hiện có.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/study-sets/saved-sets.service.ts apps/api/src/study-sets/saved-sets.service.spec.ts apps/api/src/study-sets/reports.service.ts apps/api/src/study-sets/reports.service.spec.ts
git commit -m "feat(api): SavedSetsService va ReportsService"
```

---

### Task 10: `StudySetsController` + `StudySetsModule` — nối tất cả route

**Files:**
- Create: `apps/api/src/study-sets/study-sets.controller.ts`
- Create: `apps/api/src/study-sets/study-sets.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Viết `apps/api/src/study-sets/study-sets.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  createReportSchema,
  createStudySetSchema,
  listStudySetsQuerySchema,
  replaceFlashcardsSchema,
  updateStudySetSchema,
  uuidSchema,
  type CreateReportInput,
  type CreateStudySetInput,
  type Flashcard,
  type ListStudySetsQuery,
  type PaginatedStudySets,
  type ReplaceFlashcardsInput,
  type StudySetDetail,
  type UpdateStudySetInput,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { FlashcardsService } from './flashcards.service';
import { ReportsService } from './reports.service';
import { SavedSetsService } from './saved-sets.service';
import { StudySetsService } from './study-sets.service';

@Controller('study-sets')
export class StudySetsController {
  constructor(
    private readonly studySets: StudySetsService,
    private readonly flashcards: FlashcardsService,
    private readonly savedSets: SavedSetsService,
    private readonly reports: ReportsService,
  ) {}

  @Public()
  @Get()
  list(
    @Query(new ZodValidationPipe(listStudySetsQuerySchema)) query: ListStudySetsQuery,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<PaginatedStudySets> {
    return this.studySets.list(query, user);
  }

  @Public()
  @Get(':id')
  getById(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<StudySetDetail> {
    return this.studySets.getById(id, user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudySetSchema)) input: CreateStudySetInput,
  ): Promise<StudySetDetail> {
    return this.studySets.create(user, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateStudySetSchema)) input: UpdateStudySetInput,
  ): Promise<StudySetDetail> {
    return this.studySets.update(user, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<void> {
    await this.studySets.remove(user, id);
  }

  @Put(':id/flashcards')
  replaceFlashcards(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(replaceFlashcardsSchema)) input: ReplaceFlashcardsInput,
  ): Promise<Flashcard[]> {
    return this.flashcards.replaceAll(user, id, input);
  }

  @Post(':id/save')
  @HttpCode(204)
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<void> {
    await this.savedSets.save(user, id);
  }

  @Delete(':id/save')
  @HttpCode(204)
  async unsave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<void> {
    await this.savedSets.unsave(user, id);
  }

  @Public()
  @Post(':id/reports')
  @HttpCode(204)
  async report(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(createReportSchema)) input: CreateReportInput,
  ): Promise<void> {
    await this.reports.create(user, id, input);
  }
}
```

- [ ] **Step 2: Viết `apps/api/src/study-sets/study-sets.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service';
import { ReportsService } from './reports.service';
import { SavedSetsService } from './saved-sets.service';
import { StudySetsController } from './study-sets.controller';
import { StudySetsService } from './study-sets.service';

@Module({
  controllers: [StudySetsController],
  providers: [StudySetsService, FlashcardsService, SavedSetsService, ReportsService],
})
export class StudySetsModule {}
```

- [ ] **Step 3: Đăng ký module trong `apps/api/src/app.module.ts`**

Thêm import:

```ts
import { StudySetsModule } from './study-sets/study-sets.module';
```

Thêm vào mảng `imports`, sau `ProfilesModule`:

```ts
    ProfilesModule,
    StudySetsModule,
```

- [ ] **Step 4: Build, chạy test**

Run: `pnpm --filter @flashcard/api run build && pnpm --filter @flashcard/api run test`
Expected: build và test đều pass.

- [ ] **Step 5: Kiểm chứng thủ công bằng curl (Supabase local phải đang chạy)**

```bash
ANON=$(grep -oP '(?<=^SUPABASE_ANON_KEY=")[^"]+' .env)
TOKEN=$(curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{"email":"an@example.com","password":"Password123!"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Tao bo the moi
curl -s -X POST http://localhost:4000/api/v1/study-sets -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"Test P2","flashcards":[{"term":"a","definition":"b"}]}'
```

Expected: JSON trả về có `id`, `title: "Test P2"`, `flashcards` có 1 thẻ, `visibility: "PRIVATE"`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/study-sets/study-sets.controller.ts apps/api/src/study-sets/study-sets.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): noi StudySetsController - tat ca route /study-sets"
```

---

## Phase C — Upload ảnh

### Task 11: `UploadsService` + `UploadsController`

**Files:**
- Create: `apps/api/src/uploads/uploads.service.ts`
- Create: `apps/api/src/uploads/uploads.controller.ts`
- Create: `apps/api/src/uploads/uploads.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/uploads/uploads.service.spec.ts`

- [ ] **Step 1: Viết test trước**

Tạo `apps/api/src/uploads/uploads.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import type { SupabaseAdminService } from '../supabase/supabase-admin.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const user: AuthenticatedUser = { id: 'user-1', email: 'a@example.com', role: 'authenticated' };

function makeService(createSignedUploadUrl: (path: string) => Promise<unknown>): UploadsService {
  const supabaseAdmin = {
    client: { storage: { from: () => ({ createSignedUploadUrl }) } },
  } as unknown as SupabaseAdminService;

  return new UploadsService(supabaseAdmin);
}

describe('UploadsService.createFlashcardImageUploadUrl', () => {
  it('duong dan sinh ra bat dau bang userId va dung dung phan mo rong theo contentType', async () => {
    let capturedPath = '';
    const service = makeService(async (path) => {
      capturedPath = path;
      return { data: { path, token: 'token-gia' }, error: null };
    });

    const result = await service.createFlashcardImageUploadUrl(user, {
      contentType: 'image/webp',
    });

    expect(capturedPath).toMatch(/^user-1\/[0-9a-f-]+\.webp$/);
    expect(result).toEqual({ path: capturedPath, token: 'token-gia' });
  });

  it('anh jpeg ra duoi .jpg, khong phai .jpeg', async () => {
    let capturedPath = '';
    const service = makeService(async (path) => {
      capturedPath = path;
      return { data: { path, token: 't' }, error: null };
    });

    await service.createFlashcardImageUploadUrl(user, { contentType: 'image/jpeg' });

    expect(capturedPath).toMatch(/\.jpg$/);
  });

  it('nem loi 500 khi Supabase Storage tra ve error', async () => {
    const service = makeService(async () => ({ data: null, error: new Error('boom') }));

    await expect(
      service.createFlashcardImageUploadUrl(user, { contentType: 'image/png' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — thiếu module `./uploads.service`.

- [ ] **Step 3: Viết `apps/api/src/uploads/uploads.service.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RequestUploadUrlInput, UploadUrlResult } from '@flashcard/contracts';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const BUCKET = 'flashcard-images';

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

@Injectable()
export class UploadsService {
  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  /**
   * Path luon do server sinh (UUID + duoi theo contentType), khong nhan ten file tu
   * client - tranh path traversal. contentType da duoc Zod enum whitelist truoc khi
   * toi day (xem requestUploadUrlSchema trong @flashcard/contracts).
   */
  async createFlashcardImageUploadUrl(
    user: AuthenticatedUser,
    input: RequestUploadUrlInput,
  ): Promise<UploadUrlResult> {
    const extension = EXTENSION_BY_CONTENT_TYPE[input.contentType];
    const path = `${user.id}/${randomUUID()}.${extension}`;

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new InternalServerErrorException('Không tạo được đường dẫn tải ảnh lên.');
    }

    return { path: data.path, token: data.token };
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/api run test`
Expected: PASS.

- [ ] **Step 5: Viết `apps/api/src/uploads/uploads.controller.ts`**

```ts
import { Body, Controller, Post } from '@nestjs/common';
import {
  requestUploadUrlSchema,
  type RequestUploadUrlInput,
  type UploadUrlResult,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('flashcard-image')
  createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(requestUploadUrlSchema)) input: RequestUploadUrlInput,
  ): Promise<UploadUrlResult> {
    return this.uploads.createFlashcardImageUploadUrl(user, input);
  }
}
```

- [ ] **Step 6: Viết `apps/api/src/uploads/uploads.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
```

- [ ] **Step 7: Đăng ký trong `apps/api/src/app.module.ts`**

```ts
import { UploadsModule } from './uploads/uploads.module';
```

```ts
    StudySetsModule,
    UploadsModule,
```

- [ ] **Step 8: Build, kiểm chứng thủ công**

Run: `pnpm --filter @flashcard/api run build`

```bash
curl -s -X POST http://localhost:4000/api/v1/uploads/flashcard-image -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"contentType":"image/webp"}'
```
Expected: JSON có `path` dạng `<userId>/<uuid>.webp` và `token`.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/uploads apps/api/src/app.module.ts
git commit -m "feat(api): UploadsController - cap signed URL tai anh the len Storage"
```

---

## Phase D — Folders

### Task 12: `FoldersService` + `FoldersController` + `FoldersModule`

**Files:**
- Create: `apps/api/src/folders/folder.mapper.ts`
- Create: `apps/api/src/folders/folders.service.ts`
- Create: `apps/api/src/folders/folders.controller.ts`
- Create: `apps/api/src/folders/folders.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/folders/folders.service.spec.ts`

- [ ] **Step 1: Viết `apps/api/src/folders/folder.mapper.ts`**

```ts
import type { Folder } from '@flashcard/contracts';

export function toFolder(folder: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Folder {
  return {
    id: folder.id,
    name: folder.name,
    description: folder.description,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 2: Viết test trước cho FoldersService**

Tạo `apps/api/src/folders/folders.service.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FoldersService } from './folders.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

const user: AuthenticatedUser = { id: 'user-1', email: 'a@example.com', role: 'authenticated' };

function makeService(overrides: {
  folder?: Record<string, unknown>;
  studySet?: Record<string, unknown>;
  transaction?: unknown;
}): FoldersService {
  const prisma = {
    client: {
      folder: {
        findUnique: vi.fn().mockResolvedValue({ id: 'folder-1', ownerId: 'user-1' }),
        ...overrides.folder,
      },
      studySet: { findMany: vi.fn().mockResolvedValue([]), ...overrides.studySet },
      folderStudySet: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: overrides.transaction ?? vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    },
  } as unknown as PrismaService;

  return new FoldersService(prisma);
}

describe('FoldersService quyen so huu', () => {
  it('404 khi thu muc khong ton tai', async () => {
    const service = makeService({ folder: { findUnique: vi.fn().mockResolvedValue(null) } });

    await expect(service.remove(user, 'folder-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404 khi thu muc thuoc nguoi khac - khong co khai niem folder "cong khai"', async () => {
    const service = makeService({
      folder: {
        findUnique: vi.fn().mockResolvedValue({ id: 'folder-1', ownerId: 'nguoi-khac' }),
      },
    });

    await expect(service.remove(user, 'folder-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('FoldersService.replaceStudySets', () => {
  it('400 khi mot studySetId khong ton tai hoac khong nhin thay duoc', async () => {
    const service = makeService({
      studySet: { findMany: vi.fn().mockResolvedValue([{ id: 'set-nhin-thay-duoc' }]) },
    });

    await expect(
      service.replaceStudySets(user, 'folder-1', ['set-nhin-thay-duoc', 'set-khong-ton-tai']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cho phep mang rong - lam trong folder', async () => {
    const transaction = vi.fn((ops: Promise<unknown>[]) => Promise.all(ops));
    const service = makeService({ transaction });

    await service.replaceStudySets(user, 'folder-1', []);

    expect(transaction).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — thiếu `./folders.service`.

- [ ] **Step 4: Viết `apps/api/src/folders/folders.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateFolderInput, Folder, FolderDetail, UpdateFolderInput } from '@flashcard/contracts';
import { toStudySetSummary } from '../study-sets/study-set.mapper';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { toFolder } from './folder.mapper';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser): Promise<Folder[]> {
    const folders = await this.prisma.client.folder.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    return folders.map(toFolder);
  }

  async create(user: AuthenticatedUser, input: CreateFolderInput): Promise<Folder> {
    const created = await this.prisma.client.folder.create({
      data: { ownerId: user.id, name: input.name, description: input.description ?? null },
    });
    return toFolder(created);
  }

  async getById(user: AuthenticatedUser, id: string): Promise<FolderDetail> {
    const folder = await this.prisma.client.folder.findUnique({
      where: { id },
      include: {
        links: {
          include: { studySet: { include: { owner: true } } },
          orderBy: { addedAt: 'asc' },
        },
      },
    });

    if (!folder || folder.ownerId !== user.id) {
      throw new NotFoundException('Không tìm thấy thư mục.');
    }

    return {
      ...toFolder(folder),
      studySets: folder.links.map((link) => toStudySetSummary(link.studySet)),
    };
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateFolderInput): Promise<Folder> {
    await this.assertOwnedFolder(user, id);

    const updated = await this.prisma.client.folder.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    return toFolder(updated);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.assertOwnedFolder(user, id);
    await this.prisma.client.folder.delete({ where: { id } });
  }

  /**
   * Cho phep gan bat ky bo the ma nguoi dung hien tai NHIN THAY duoc (public, unlisted,
   * hoac private cua chinh minh) - khong gioi han chi bo the tu tao. Xem muc 2.4 spec.
   */
  async replaceStudySets(
    user: AuthenticatedUser,
    folderId: string,
    studySetIds: string[],
  ): Promise<void> {
    await this.assertOwnedFolder(user, folderId);

    if (studySetIds.length > 0) {
      const visibleSets = await this.prisma.client.studySet.findMany({
        where: {
          id: { in: studySetIds },
          OR: [{ visibility: { in: ['PUBLIC', 'UNLISTED'] } }, { ownerId: user.id }],
        },
        select: { id: true },
      });

      if (visibleSets.length !== studySetIds.length) {
        throw new BadRequestException('Một số bộ thẻ không tồn tại hoặc bạn không có quyền xem.');
      }
    }

    await this.prisma.client.$transaction([
      this.prisma.client.folderStudySet.deleteMany({ where: { folderId } }),
      this.prisma.client.folderStudySet.createMany({
        data: studySetIds.map((studySetId) => ({ folderId, studySetId })),
      }),
    ]);
  }

  private async assertOwnedFolder(user: AuthenticatedUser, id: string): Promise<void> {
    const folder = await this.prisma.client.folder.findUnique({ where: { id } });
    if (!folder || folder.ownerId !== user.id) {
      throw new NotFoundException('Không tìm thấy thư mục.');
    }
  }
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/api run test`
Expected: PASS.

- [ ] **Step 6: Viết `apps/api/src/folders/folders.controller.ts`**

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import {
  createFolderSchema,
  replaceFolderStudySetsSchema,
  updateFolderSchema,
  uuidSchema,
  type CreateFolderInput,
  type Folder,
  type FolderDetail,
  type ReplaceFolderStudySetsInput,
  type UpdateFolderInput,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { FoldersService } from './folders.service';

@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Folder[]> {
    return this.folders.list(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createFolderSchema)) input: CreateFolderInput,
  ): Promise<Folder> {
    return this.folders.create(user, input);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<FolderDetail> {
    return this.folders.getById(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateFolderSchema)) input: UpdateFolderInput,
  ): Promise<Folder> {
    return this.folders.update(user, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<void> {
    await this.folders.remove(user, id);
  }

  @Put(':id/study-sets')
  @HttpCode(204)
  async replaceStudySets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(replaceFolderStudySetsSchema)) input: ReplaceFolderStudySetsInput,
  ): Promise<void> {
    await this.folders.replaceStudySets(user, id, input);
  }
}
```

- [ ] **Step 7: Viết `apps/api/src/folders/folders.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

@Module({
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}
```

- [ ] **Step 8: Đăng ký trong `apps/api/src/app.module.ts`**

```ts
import { FoldersModule } from './folders/folders.module';
```

```ts
    FoldersModule,
    ProfilesModule,
```

- [ ] **Step 9: Build và kiểm chứng thủ công**

Run: `pnpm --filter @flashcard/api run build`

```bash
curl -s -X POST http://localhost:4000/api/v1/folders -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Tu vung IELTS"}'
```
Expected: JSON có `id`, `name: "Tu vung IELTS"`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/folders apps/api/src/app.module.ts
git commit -m "feat(api): FoldersModule - CRUD folder va gan bo the"
```

---

## Phase E — Frontend: hàm thuần (test được)

### Task 13: Parser dán nhanh `parseQuickPaste`

**Files:**
- Create: `apps/web/src/lib/quick-paste.ts`
- Test: `apps/web/src/lib/quick-paste.test.ts`

- [ ] **Step 1: Viết test trước**

Tạo `apps/web/src/lib/quick-paste.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseQuickPaste } from './quick-paste';

describe('parseQuickPaste', () => {
  it('tach dung moi dong thanh mot the, term va definition ngan cach boi tab', () => {
    const result = parseQuickPaste('chào\txin chào\ncảm ơn\tthank you');
    expect(result).toEqual([
      { term: 'chào', definition: 'xin chào' },
      { term: 'cảm ơn', definition: 'thank you' },
    ]);
  });

  it('bo qua dong rong', () => {
    const result = parseQuickPaste('a\tb\n\n\nc\td');
    expect(result).toHaveLength(2);
  });

  it('bo qua dong khong co tab', () => {
    const result = parseQuickPaste('a\tb\nkhong-co-tab\nc\td');
    expect(result).toEqual([
      { term: 'a', definition: 'b' },
      { term: 'c', definition: 'd' },
    ]);
  });

  it('bo qua dong ma term hoac definition rong sau khi trim', () => {
    expect(parseQuickPaste('\tb')).toEqual([]);
    expect(parseQuickPaste('a\t   ')).toEqual([]);
  });

  it('cat khoang trang thua o hai dau term va definition', () => {
    expect(parseQuickPaste('  a  \t  b  ')).toEqual([{ term: 'a', definition: 'b' }]);
  });

  it('chi tach tai tab dau tien - dinh nghia co the chua tab', () => {
    expect(parseQuickPaste('a\tb\tc')).toEqual([{ term: 'a', definition: 'b\tc' }]);
  });

  it('ho tro ca CRLF va LF', () => {
    expect(parseQuickPaste('a\tb\r\nc\td')).toEqual([
      { term: 'a', definition: 'b' },
      { term: 'c', definition: 'd' },
    ]);
  });

  it('chuoi rong tra ve mang rong', () => {
    expect(parseQuickPaste('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/web run test`
Expected: FAIL — `Cannot find module './quick-paste'`

- [ ] **Step 3: Viết `apps/web/src/lib/quick-paste.ts`**

```ts
export type ParsedCard = { term: string; definition: string };

/**
 * Tach van ban dan vao thanh danh sach the: moi dong la mot the, term va definition
 * ngan cach boi tab (dung dinh dang khi dan tu Excel/Google Sheets). Dong rong hoac
 * thieu tab bi bo qua - khong bao loi, chi loc lang le vi day la tinh nang "dan
 * nhanh", nguoi dung se tu kiem lai so the hien ra.
 */
export function parseQuickPaste(text: string): ParsedCard[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line): ParsedCard | null => {
      const tabIndex = line.indexOf('\t');
      if (tabIndex === -1) return null;

      const term = line.slice(0, tabIndex).trim();
      const definition = line.slice(tabIndex + 1).trim();
      if (!term || !definition) return null;

      return { term, definition };
    })
    .filter((card): card is ParsedCard => card !== null);
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter @flashcard/web run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/quick-paste.ts apps/web/src/lib/quick-paste.test.ts
git commit -m "feat(web): parser dan nhanh cho form tao bo the"
```

---

### Task 14: Nén ảnh + luồng upload ảnh thẻ

**Files:**
- Create: `apps/web/src/lib/compress-image.ts`
- Create: `apps/web/src/lib/upload-flashcard-image.ts`

- [ ] **Step 1: Viết `apps/web/src/lib/compress-image.ts`**

Ghi chú spec: hàm này dùng Canvas API của trình duyệt, **không unit-test được trong jsdom** (đã ghi rõ trong spec mục 6 — giới hạn đã biết). Xác minh bằng tay khi review UI.

```ts
const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 0.85;

/**
 * Resize anh ve toi da 1200px canh dai va nen sang WebP ngay tren trinh duyet truoc
 * khi upload - giam dung luong Storage va toc do tai trang. Khong unit-test duoc
 * trong jsdom (can Canvas API thuc cua trinh duyet) - xac minh bang tay khi review.
 */
export async function compressImageToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Trình duyệt không hỗ trợ canvas 2D.');
  }
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Không nén được ảnh.'))),
      'image/webp',
      WEBP_QUALITY,
    );
  });
}
```

- [ ] **Step 2: Viết `apps/web/src/lib/upload-flashcard-image.ts`**

```ts
import { createClient } from '@/lib/supabase/client';
import { apiBrowser } from '@/lib/api/browser';
import { compressImageToWebp } from './compress-image';

const BUCKET = 'flashcard-images';

/**
 * Toan bo luong: nen anh -> xin signed URL tu NestJS -> upload thang len Storage bang
 * SDK cua Supabase (khong qua NestJS). Tra ve `imagePath` de luu vao state cua the,
 * gui kem khi bam Luu bo the.
 */
export async function uploadFlashcardImage(file: File): Promise<string> {
  const compressed = await compressImageToWebp(file);

  const { path, token } = await apiBrowser<{ path: string; token: string }>(
    '/uploads/flashcard-image',
    { method: 'POST', body: { contentType: 'image/webp' } },
  );

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, compressed, { contentType: 'image/webp' });

  if (error) {
    throw new Error(`Tải ảnh lên không thành công: ${error.message}`);
  }

  return path;
}

/** Bucket public-read: URL cong khai khong can ky, dung duong dan UUID lam an toan. */
export function flashcardImageUrl(path: string): string {
  return createClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
```

- [ ] **Step 3: Build để xác nhận không lỗi TypeScript**

Run: `pnpm --filter @flashcard/web run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/compress-image.ts apps/web/src/lib/upload-flashcard-image.ts
git commit -m "feat(web): nen anh + luong upload anh the qua signed URL"
```

---

## Phase F — Frontend: form tạo/sửa bộ thẻ

### Task 15: Thêm dnd-kit, viết `CardRow` (một dòng thẻ, kéo-thả)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/components/study-sets/card-row.tsx`

- [ ] **Step 1: Thêm dependency dnd-kit**

Trong `apps/web/package.json`, thêm vào `dependencies`:

```json
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^9.0.0",
    "@dnd-kit/utilities": "^3.2.2",
```

Run: `pnpm install`
Expected: cài xong.

- [ ] **Step 2: Viết `apps/web/src/components/study-sets/card-row.tsx`**

```tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { flashcardImageUrl, uploadFlashcardImage } from '@/lib/upload-flashcard-image';

export type CardDraft = {
  /** Key on dinh cho React/dnd-kit - KHONG phai id thuc trong database. */
  key: string;
  /** id thuc su - chi co khi the da ton tai trong database (dang sua bo the). */
  id?: string;
  term: string;
  definition: string;
  imagePath: string | null;
};

export function CardRow({
  card,
  index,
  onChange,
  onRemove,
}: {
  card: CardDraft;
  index: number;
  onChange: (next: CardDraft) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.key,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const path = await uploadFlashcardImage(file);
      onChange({ ...card, imagePath: path });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Tải ảnh lên thất bại.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex gap-3 rounded-lg border border-border bg-card p-4',
        isDragging && 'opacity-50',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-2 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Kéo để sắp xếp lại thẻ số ${index + 1}`}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <span className="mt-2.5 w-6 shrink-0 text-sm text-muted-foreground">{index + 1}</span>

      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <Textarea
          value={card.term}
          onChange={(event) => onChange({ ...card, term: event.target.value })}
          placeholder="Thuật ngữ"
          rows={2}
        />
        <Textarea
          value={card.definition}
          onChange={(event) => onChange({ ...card, definition: event.target.value })}
          placeholder="Định nghĩa"
          rows={2}
        />
      </div>

      <div className="flex w-24 shrink-0 flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={onPickImage}
        />

        {card.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element -- anh do nguoi dung tu chon, khong biet truoc kich thuoc de dung next/image toi uu
          <img
            src={flashcardImageUrl(card.imagePath)}
            alt=""
            className="size-14 rounded-md object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex size-14 items-center justify-center rounded-md border border-dashed border-input text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Thêm ảnh minh họa"
          >
            <ImagePlus className="size-5" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Xóa thẻ số ${index + 1}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>

        {uploadError && (
          <p role="alert" className="text-center text-xs text-destructive">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build để xác nhận không lỗi TypeScript**

Run: `pnpm --filter @flashcard/web run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/components/study-sets/card-row.tsx
git commit -m "feat(web): CardRow - mot dong the co keo-tha va upload anh"
```

---

### Task 16: `StudySetForm` — form tạo/sửa dùng chung, dán nhanh, submit thật

**Files:**
- Create: `apps/web/src/components/study-sets/quick-paste-panel.tsx`
- Create: `apps/web/src/components/study-sets/study-set-form.tsx`
- Modify: `apps/web/src/app/sets/create/page.tsx`

- [ ] **Step 1: Viết `apps/web/src/components/study-sets/quick-paste-panel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseQuickPaste } from '@/lib/quick-paste';

/**
 * Bang dieu khien khong phai modal - chi la mot khoi mo/dong ngay tren trang, tranh
 * phai them thu vien Dialog moi khi chua co primitive nao cho no trong du an.
 */
export function QuickPastePanel({ onImport }: { onImport: (text: string) => number }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);

  function handleImport() {
    const count = onImport(text);
    setImportedCount(count);
    setText('');
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Dán nhanh
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">
        Dán danh sách thẻ, mỗi dòng một thẻ, thuật ngữ và định nghĩa ngăn cách bởi dấu Tab
        (đúng định dạng khi dán từ Excel hoặc Google Sheets).
      </p>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={'chào\txin chào\ncảm ơn\tthank you'}
        rows={6}
        className="mt-3"
      />
      {importedCount !== null && (
        <p className="mt-2 text-sm text-success">Đã thêm {importedCount} thẻ.</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" onClick={handleImport} disabled={!text.trim()}>
          Thêm vào bộ thẻ
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Đóng
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Viết `apps/web/src/components/study-sets/study-set-form.tsx`**

```tsx
'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { StudySetDetail, Visibility } from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiBrowser } from '@/lib/api/browser';
import { ApiRequestError } from '@/lib/api/request';
import { parseQuickPaste } from '@/lib/quick-paste';
import { CardRow, type CardDraft } from './card-row';
import { QuickPastePanel } from './quick-paste-panel';

let keySeed = 0;
function newCardKey(): string {
  keySeed += 1;
  return `card-${keySeed}`;
}

function emptyCard(): CardDraft {
  return { key: newCardKey(), term: '', definition: '', imagePath: null };
}

function fromExisting(set: StudySetDetail): CardDraft[] {
  return set.flashcards.map((card) => ({
    key: newCardKey(),
    id: card.id,
    term: card.term,
    definition: card.definition,
    imagePath: card.imagePath,
  }));
}

export function StudySetForm({ existing }: { existing?: StudySetDetail }) {
  const router = useRouter();
  const isEdit = existing !== undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [visibility, setVisibility] = useState<Visibility>(existing?.visibility ?? 'PRIVATE');
  const [cards, setCards] = useState<CardDraft[]>(
    existing ? fromExisting(existing) : [emptyCard()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCards((current) => {
      const fromIndex = current.findIndex((card) => card.key === active.id);
      const toIndex = current.findIndex((card) => card.key === over.id);
      return arrayMove(current, fromIndex, toIndex);
    });
  }

  function importQuickPaste(text: string): number {
    const parsed = parseQuickPaste(text);
    setCards((current) => [
      ...current,
      ...parsed.map((card) => ({ key: newCardKey(), term: card.term, definition: card.definition, imagePath: null })),
    ]);
    return parsed.length;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validCards = cards.filter((card) => card.term.trim() && card.definition.trim());
    if (validCards.length === 0) {
      setError('Bộ thẻ phải có ít nhất 1 thẻ đầy đủ thuật ngữ và định nghĩa.');
      return;
    }
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề.');
      return;
    }

    setSaving(true);

    const flashcardsPayload = validCards.map((card) => ({
      ...(card.id ? { id: card.id } : {}),
      term: card.term.trim(),
      definition: card.definition.trim(),
      imagePath: card.imagePath,
    }));

    try {
      if (isEdit) {
        await apiBrowser(`/study-sets/${existing.id}`, {
          method: 'PATCH',
          body: {
            title: title.trim(),
            description: description.trim() || null,
            subject: subject.trim() || null,
            visibility,
          },
        });
        await apiBrowser(`/study-sets/${existing.id}/flashcards`, {
          method: 'PUT',
          body: flashcardsPayload,
        });
        router.push(`/sets/${existing.id}`);
      } else {
        const created = await apiBrowser<StudySetDetail>('/study-sets', {
          method: 'POST',
          body: {
            title: title.trim(),
            description: description.trim() || null,
            subject: subject.trim() || null,
            visibility,
            flashcards: flashcardsPayload,
          },
        });
        router.push(`/sets/${created.id}`);
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Không lưu được bộ thẻ.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <Field id="title" label="Tiêu đề">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </Field>

      <Field id="description" label="Mô tả" hint="Không bắt buộc.">
        <Textarea value={description ?? ''} onChange={(event) => setDescription(event.target.value)} rows={2} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="subject" label="Môn học" hint="Không bắt buộc.">
          <Input value={subject ?? ''} onChange={(event) => setSubject(event.target.value)} />
        </Field>

        <div className="space-y-1.5">
          <Label htmlFor="visibility">Quyền riêng tư</Label>
          <select
            id="visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as Visibility)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="PRIVATE">Riêng tư - chỉ mình tôi</option>
            <option value="UNLISTED">Không công khai - ai có link đều xem được</option>
            <option value="PUBLIC">Công khai - hiện ở trang Khám phá</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Thẻ ({cards.length})</h2>
          <div className="flex gap-2">
            <QuickPastePanel onImport={importQuickPaste} />
            <Button type="button" variant="outline" size="sm" onClick={() => setCards((c) => [...c, emptyCard()])}>
              + Thêm thẻ
            </Button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={cards.map((card) => card.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-4 space-y-3">
              {cards.map((card, index) => (
                <CardRow
                  key={card.key}
                  card={card}
                  index={index}
                  onChange={(next) =>
                    setCards((current) => current.map((c) => (c.key === card.key ? next : c)))
                  }
                  onRemove={() => setCards((current) => current.filter((c) => c.key !== card.key))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo bộ thẻ'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Thay nội dung `apps/web/src/app/sets/create/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { StudySetForm } from '@/components/study-sets/study-set-form';

export const metadata: Metadata = {
  title: 'Tạo bộ thẻ',
  robots: { index: false, follow: false },
};

export default function CreateStudySetPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Tạo bộ thẻ mới</h1>
      <p className="mt-2 text-muted-foreground">
        Thêm tiêu đề, mô tả và các thẻ ghi nhớ cho bộ thẻ của bạn.
      </p>
      <div className="mt-8">
        <StudySetForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build, chạy test**

Run: `pnpm --filter @flashcard/web run build && pnpm --filter @flashcard/web run test`
Expected: build và test PASS.

- [ ] **Step 5: Kiểm chứng bằng tay trên trình duyệt** (Supabase + api + web đều phải chạy)

Chạy `pnpm dev`, đăng nhập `an@example.com`/`Password123!`, vào `/sets/create`: nhập tiêu đề, bấm "Dán nhanh", dán `chào\txin chào` rồi `Enter`, bấm "Thêm vào bộ thẻ" — xác nhận thẻ mới xuất hiện. Kéo-thả đổi thứ tự hai thẻ. Bấm "Tạo bộ thẻ" — xác nhận chuyển sang `/sets/<id>` (404 tạm ổn, trang chi tiết làm ở Task 17) và bộ thẻ xuất hiện đúng trong Prisma Studio (`pnpm db:studio`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/study-sets apps/web/src/app/sets/create/page.tsx
git commit -m "feat(web): StudySetForm - tao bo the voi dan nhanh va keo-tha"
```

---

## Phase G — Frontend: các trang còn lại

### Task 17: Trang chi tiết `/sets/[id]` + trang sửa `/sets/[id]/edit`

**Files:**
- Create: `apps/web/src/app/sets/[id]/page.tsx`
- Create: `apps/web/src/app/sets/[id]/edit/page.tsx`

- [ ] **Step 1: Viết `apps/web/src/app/sets/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { StudySetDetail } from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/request';
import { createClient } from '@/lib/supabase/server';

type PageProps = { params: Promise<{ id: string }> };

async function loadSet(id: string): Promise<StudySetDetail | null> {
  try {
    return await apiServer<StudySetDetail>(`/study-sets/${id}`, { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const set = await loadSet(id);
  if (!set) return { title: 'Không tìm thấy bộ thẻ', robots: { index: false } };
  return {
    title: set.title,
    description: set.description ?? undefined,
    robots: set.visibility === 'PUBLIC' ? undefined : { index: false },
  };
}

export default async function StudySetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const set = await loadSet(id);
  if (!set) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === set.owner.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {set.subject ?? 'Chưa phân loại'} · {set.cardCount} thẻ
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{set.title}</h1>
          {set.description && <p className="mt-2 text-muted-foreground">{set.description}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            Tạo bởi{' '}
            <Link href={`/u/${set.owner.username}`} className="text-primary hover:underline">
              {set.owner.displayName ?? set.owner.username}
            </Link>
          </p>
        </div>

        {isOwner && (
          <Link href={`/sets/${set.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
            Sửa bộ thẻ
          </Link>
        )}
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Thẻ ghi nhớ', href: `/sets/${set.id}/flashcards` },
          { label: 'Học', href: `/sets/${set.id}/learn` },
          { label: 'Kiểm tra', href: `/sets/${set.id}/test` },
          { label: 'Ghép cặp', href: `/sets/${set.id}/match` },
        ].map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className={buttonVariants({ variant: 'secondary', className: undefined })}
          >
            {mode.label}
          </Link>
        ))}
      </div>

      <Alert className="mt-4">
        Bốn chế độ học sẽ hoạt động ở Giai đoạn 3. Bấm vào đây hiện chỉ dẫn tới trang chưa tồn tại.
      </Alert>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold">Danh sách thẻ</h2>
          <ul className="mt-4 divide-y divide-border">
            {set.flashcards.map((card) => (
              <li key={card.id} className="grid gap-2 py-3 sm:grid-cols-2">
                <p>{card.term}</p>
                <p className="text-muted-foreground">{card.definition}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

Lưu ý dòng `className: undefined` trong `buttonVariants({ variant: 'secondary', className: undefined })` — đây là **sai**, lặp lại đúng bug đã cảnh báo ở đầu plan. Sửa lại đúng bằng `cn()`:

```tsx
import { cn } from '@/lib/utils';
```

```tsx
          <Link
            key={mode.href}
            href={mode.href}
            className={cn(buttonVariants({ variant: 'secondary' }), 'justify-center')}
          >
            {mode.label}
          </Link>
```

- [ ] **Step 2: Viết `apps/web/src/app/sets/[id]/edit/page.tsx`**

`GET /study-sets/:id` không kiểm tra quyền sở hữu (chỉ kiểm tra hiển thị — ai xem cũng
được nếu bộ thẻ `PUBLIC`/`UNLISTED`), nên trang này phải **tự** so `set.owner.id` với
người đang đăng nhập trước khi hiện form sửa — nếu không, ai cũng mở được form sửa
(đã điền sẵn nội dung) của một bộ thẻ công khai không phải của họ, dù submit thật sẽ
bị API chặn 403. Không được bỏ qua bước này.

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { StudySetDetail } from '@flashcard/contracts';
import { StudySetForm } from '@/components/study-sets/study-set-form';
import { ApiRequestError } from '@/lib/api/request';
import { apiServer } from '@/lib/api/server';
import { createClient } from '@/lib/supabase/server';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: 'Sửa bộ thẻ', robots: { index: false, follow: false } };

export default async function EditStudySetPage({ params }: PageProps) {
  const { id } = await params;

  let set: StudySetDetail;
  try {
    set = await apiServer<StudySetDetail>(`/study-sets/${id}`, { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // GET /study-sets/:id chi kiem tra hien thi, khong kiem tra quyen so huu - phai tu
  // chan o day, khong the tin API se lam thay.
  if (user?.id !== set.owner.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Sửa bộ thẻ</h1>
      <div className="mt-8">
        <StudySetForm existing={set} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `pnpm --filter @flashcard/web run build`
Expected: build thành công, không còn `className: undefined`.

- [ ] **Step 4: Kiểm chứng bằng tay**

Vào `/sets/<id>` của bộ thẻ vừa tạo ở Task 16 — xác nhận thấy đúng tiêu đề, danh sách thẻ, nút "Sửa bộ thẻ" (vì đang đăng nhập là owner). Bấm "Sửa bộ thẻ", đổi tiêu đề, bấm "Lưu thay đổi" — xác nhận quay lại trang chi tiết với tiêu đề mới.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/sets/[id]
git commit -m "feat(web): trang chi tiet va sua bo the"
```

---

### Task 18: Trang Explore thật (tìm kiếm, lọc, sắp, phân trang)

**Files:**
- Modify: `apps/web/src/app/explore/page.tsx`

- [ ] **Step 1: Viết lại `apps/web/src/app/explore/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import type { PaginatedStudySets, StudySetSort } from '@flashcard/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/api/request';

export const metadata: Metadata = {
  title: 'Khám phá',
  description: 'Khám phá các bộ thẻ công khai do cộng đồng tạo ra.',
};

type SearchParams = { q?: string; subject?: string; sort?: string; page?: string };

function isValidSort(value: string | undefined): value is StudySetSort {
  return value === 'newest' || value === 'popular';
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sort: StudySetSort = isValidSort(params.sort) ? params.sort : 'newest';
  const page = Number.parseInt(params.page ?? '1', 10) || 1;

  const query = new URLSearchParams({ sort, page: String(page) });
  if (params.q) query.set('q', params.q);
  if (params.subject) query.set('subject', params.subject);

  const result = await apiRequest<PaginatedStudySets>(`/study-sets?${query.toString()}`, {
    next: { revalidate: 30 },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Khám phá</h1>

      <form action="/explore" method="get" className="mt-6 flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Tìm kiếm bộ thẻ..."
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base"
        />
        <input
          type="text"
          name="subject"
          defaultValue={params.subject ?? ''}
          placeholder="Môn học"
          className="h-11 w-40 rounded-md border border-input bg-background px-3 text-base"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="h-11 rounded-md border border-input bg-background px-3 text-base"
        >
          <option value="newest">Mới nhất</option>
          <option value="popular">Phổ biến</option>
        </select>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Tìm
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Không tìm thấy bộ thẻ nào phù hợp.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((set) => (
            <li key={set.id}>
              <Link href={`/sets/${set.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">{set.subject ?? 'Chưa phân loại'}</p>
                    <h2 className="mt-1 font-semibold">{set.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {set.cardCount} thẻ · {set.owner.displayName ?? set.owner.username}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Phân trang">
          {Array.from({ length: result.totalPages }, (_, index) => index + 1).map((pageNumber) => {
            const linkParams = new URLSearchParams(query);
            linkParams.set('page', String(pageNumber));
            return (
              <Link
                key={pageNumber}
                href={`/explore?${linkParams.toString()}`}
                className={
                  pageNumber === page
                    ? 'flex size-9 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground'
                    : 'flex size-9 items-center justify-center rounded-md text-sm font-medium hover:bg-muted'
                }
                aria-current={pageNumber === page ? 'page' : undefined}
              >
                {pageNumber}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @flashcard/web run build`
Expected: thành công.

- [ ] **Step 3: Kiểm chứng bằng tay**

Vào `/explore` — thấy bộ thẻ `PUBLIC` đã seed từ P1 ("Tiếng Nhật sơ cấp...", "IELTS Academic..."). Gõ "ielts" vào ô tìm kiếm, bấm Tìm — chỉ còn 1 kết quả. Đổi sort sang "Phổ biến" — thứ tự đổi theo `viewCount`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/explore/page.tsx
git commit -m "feat(web): trang Explore - tim kiem, loc, sap, phan trang"
```

---

### Task 19: Dashboard 2 tab — "Bộ thẻ của tôi" / "Đã lưu"

**Files:**
- Create: `apps/web/src/app/dashboard/study-sets-tab.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Viết `apps/web/src/app/dashboard/study-sets-tab.tsx`**

```tsx
import Link from 'next/link';
import type { PaginatedStudySets } from '@flashcard/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';

export async function StudySetsTab({ mode }: { mode: 'mine' | 'saved' }) {
  const query = mode === 'mine' ? 'mine=true' : 'saved=true';
  const result = await apiServer<PaginatedStudySets>(`/study-sets?${query}&pageSize=50`, {
    cache: 'no-store',
  });

  if (result.items.length === 0) {
    return (
      <p className="mt-6 text-muted-foreground">
        {mode === 'mine' ? 'Bạn chưa tạo bộ thẻ nào.' : 'Bạn chưa lưu bộ thẻ nào.'}
      </p>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.items.map((set) => (
        <li key={set.id}>
          <Link href={`/sets/${set.id}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{set.subject ?? 'Chưa phân loại'}</p>
                <h3 className="mt-1 font-semibold">{set.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{set.cardCount} thẻ</p>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Sửa `apps/web/src/app/dashboard/page.tsx`**

Thay toàn bộ nội dung file bằng:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeProfile } from '@flashcard/contracts';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';
import { StudySetsTab } from './study-sets-tab';

export const metadata: Metadata = {
  title: 'Bảng điều khiển',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === 'saved' ? 'saved' : 'mine';

  const me = await apiServer<MeProfile>('/profiles/me');
  const displayName = me.displayName ?? me.username;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chào {displayName}</h1>
          <p className="mt-1 text-muted-foreground">
            Hồ sơ công khai:{' '}
            <Link href={`/u/${me.username}`} className="text-primary hover:underline">
              /u/{me.username}
            </Link>
          </p>
        </div>
        <Link href="/settings" className={buttonVariants({ variant: 'outline' })}>
          Chỉnh sửa hồ sơ
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thẻ đã thuộc</CardTitle>
            <CardDescription>Trên tổng số thẻ đang học</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cần ôn hôm nay</CardTitle>
            <CardDescription>Thẻ đến hạn nhắc lại</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>
      </div>

      <nav className="mt-10 flex gap-1 border-b border-border" aria-label="Chuyển tab">
        <Link
          href="/dashboard?tab=mine"
          className={
            activeTab === 'mine'
              ? 'border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary'
              : 'px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground'
          }
        >
          Bộ thẻ của tôi
        </Link>
        <Link
          href="/dashboard?tab=saved"
          className={
            activeTab === 'saved'
              ? 'border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary'
              : 'px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground'
          }
        >
          Đã lưu
        </Link>
      </nav>

      <StudySetsTab mode={activeTab} />
    </div>
  );
}
```

Lý do dùng `?tab=` (query param, server render lại) thay vì tab client-side: giữ trang hoàn toàn Server Component, không cần thêm `'use client'` chỉ để chuyển tab, và URL chia sẻ được đúng tab đang xem — đơn giản nhất phù hợp với App Router.

Đã bỏ khối "Bộ thẻ của bạn" (0 tĩnh) — thay bằng danh sách thật ở `StudySetsTab`, và thống kê thẻ/tiến độ vẫn giữ placeholder vì thuộc Giai đoạn 3.

- [ ] **Step 3: Build**

Run: `pnpm --filter @flashcard/web run build`
Expected: thành công.

- [ ] **Step 4: Kiểm chứng bằng tay**

Đăng nhập, vào `/dashboard` — tab "Bộ thẻ của tôi" hiện bộ thẻ vừa tạo ở Task 16. Bấm tab "Đã lưu" — hiện "Bạn chưa lưu bộ thẻ nào." (chưa có nút Lưu trên UI — đó là Task 20).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard
git commit -m "feat(web): dashboard 2 tab - Bo the cua toi / Da luu"
```

---

### Task 20: Nút Lưu bộ thẻ + nút Báo cáo trên trang chi tiết

**Files:**
- Create: `apps/web/src/components/study-sets/save-button.tsx`
- Create: `apps/web/src/components/study-sets/report-button.tsx`
- Modify: `apps/web/src/app/sets/[id]/page.tsx`

- [ ] **Step 1: Viết `apps/web/src/components/study-sets/save-button.tsx`**

```tsx
'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';

export function SaveButton({ studySetId, initialSaved }: { studySetId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      await apiBrowser(`/study-sets/${studySetId}/save`, { method: saved ? 'DELETE' : 'POST' });
      setSaved(!saved);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={pending}>
      {saved ? (
        <BookmarkCheck className="size-4" aria-hidden="true" />
      ) : (
        <Bookmark className="size-4" aria-hidden="true" />
      )}
      {saved ? 'Đã lưu' : 'Lưu'}
    </Button>
  );
}
```

Ghi chú: component này cần biết `initialSaved` — trang chi tiết hiện chưa gọi API nào cho biết viewer đã lưu set này chưa. Đơn giản hoá cho P2: luôn truyền `initialSaved={false}` từ trang chi tiết (không tra cứu trạng thái đã lưu khi tải trang) — bấm "Lưu" vẫn hoạt động đúng, chỉ là nếu rời trang rồi quay lại thì nút hiện lại "Lưu" dù đã lưu trước đó. Ghi rõ đây là giới hạn đã biết, không phải bug — cần một endpoint kiểm tra trạng thái riêng để hoàn thiện, để dành nếu cần.

- [ ] **Step 2: Viết `apps/web/src/components/study-sets/report-button.tsx`**

```tsx
'use client';

import { Flag } from 'lucide-react';
import { useState } from 'react';
import type { ReportReason } from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'SPAM', label: 'Spam / quảng cáo' },
  { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp' },
  { value: 'COPYRIGHT', label: 'Vi phạm bản quyền' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export function ReportButton({ studySetId }: { studySetId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(reason: ReportReason) {
    setSending(true);
    try {
      await apiBrowser(`/study-sets/${studySetId}/reports`, { method: 'POST', body: { reason } });
      setSent(true);
      setOpen(false);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <Alert tone="success">Đã gửi báo cáo, cảm ơn bạn.</Alert>;
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="size-4" aria-hidden="true" />
        Báo cáo nội dung
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Chọn lý do báo cáo</p>
      <div className="mt-2 flex flex-col gap-1">
        {REASONS.map((reason) => (
          <button
            key={reason.value}
            type="button"
            onClick={() => submit(reason.value)}
            disabled={sending}
            className="rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
          >
            {reason.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Nối vào trang chi tiết `apps/web/src/app/sets/[id]/page.tsx`**

Thêm import:

```tsx
import { ReportButton } from '@/components/study-sets/report-button';
import { SaveButton } from '@/components/study-sets/save-button';
```

Trong khối `<header>`, thêm cạnh nút "Sửa bộ thẻ" — người xem KHÔNG phải owner mới thấy nút Lưu/Báo cáo (owner xem bộ thẻ của chính mình không cần lưu):

```tsx
        <div className="flex gap-2">
          {isOwner ? (
            <Link href={`/sets/${set.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
              Sửa bộ thẻ
            </Link>
          ) : (
            <>
              <SaveButton studySetId={set.id} initialSaved={false} />
              <ReportButton studySetId={set.id} />
            </>
          )}
        </div>
```

(Thay cho khối `{isOwner && (...)}` cũ.)

- [ ] **Step 4: Build**

Run: `pnpm --filter @flashcard/web run build`
Expected: thành công.

- [ ] **Step 5: Kiểm chứng bằng tay**

Đăng xuất, vào `/sets/<id-cua-bo-the-public>` — thấy nút "Lưu" và "Báo cáo nội dung" (không thấy "Sửa bộ thẻ"). Bấm Lưu — đổi thành "Đã lưu". Đăng nhập lại bằng một tài khoản khác, vào `/dashboard?tab=saved` — thấy bộ thẻ đó (chỉ khi đăng nhập bằng đúng tài khoản đã bấm Lưu).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/study-sets/save-button.tsx apps/web/src/components/study-sets/report-button.tsx apps/web/src/app/sets/[id]/page.tsx
git commit -m "feat(web): nut Luu bo the va Bao cao noi dung tren trang chi tiet"
```

---

### Task 21: Trang folder `/folders/[id]` + nối dữ liệu thật vào sidebar

**Files:**
- Create: `apps/web/src/app/folders/[id]/page.tsx`
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/components/layout/sidebar-content.tsx`
- Modify: `apps/web/src/components/layout/nav-data.ts`

- [ ] **Step 1: Viết `apps/web/src/app/folders/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { FolderDetail } from '@flashcard/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { ApiRequestError } from '@/lib/api/request';
import { apiServer } from '@/lib/api/server';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FolderPage({ params }: PageProps) {
  const { id } = await params;

  let folder: FolderDetail;
  try {
    folder = await apiServer<FolderDetail>(`/folders/${id}`, { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">
          Thư mục
        </Link>{' '}
        / {folder.name}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{folder.name}</h1>
      {folder.description && <p className="mt-2 text-muted-foreground">{folder.description}</p>}

      {folder.studySets.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Thư mục này chưa có bộ thẻ nào.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folder.studySets.map((set) => (
            <li key={set.id}>
              <Link href={`/sets/${set.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">{set.subject ?? 'Chưa phân loại'}</p>
                    <h2 className="mt-1 font-semibold">{set.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{set.cardCount} thẻ</p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Xóa `PLACEHOLDER_FOLDERS` khỏi `apps/web/src/components/layout/nav-data.ts`**

Xóa hẳn đoạn sau (không giữ lại, không comment `// removed`):

```ts
/**
 * Du lieu tam cho muc "Thu muc cua ban".
 * ...
 */
export const PLACEHOLDER_FOLDERS = ['Từ vựng IELTS', 'Ngữ pháp N3', 'Ôn tập giữa kỳ'];
```

- [ ] **Step 3: Sửa `apps/web/src/components/layout/sidebar-content.tsx`**

Thay import và chữ ký hàm — nhận `folders: Folder[]` thay vì tự import placeholder:

```tsx
import Link from 'next/link';
import { Folder as FolderIcon, FolderPlus, Layers } from 'lucide-react';
import type { Folder } from '@flashcard/contracts';
import { getPrimaryNavItems } from './nav-data';
import { NavLink } from './nav-link';

export function SidebarContent({
  isLoggedIn,
  folders,
}: {
  isLoggedIn: boolean;
  folders: Folder[];
}) {
```

Thay toàn bộ khối `{isLoggedIn && (...)}` cũ (chứa `PLACEHOLDER_FOLDERS`) bằng:

```tsx
      {isLoggedIn && (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Thư mục của bạn
            </span>
          </div>

          {folders.length === 0 ? (
            <p className="mt-2 px-3 text-sm text-muted-foreground">Chưa có thư mục nào.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-0.5">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <Link
                    href={`/folders/${folder.id}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <FolderIcon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{folder.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
```

Đổi icon import từ `Folder` (trùng tên với type `Folder` của contracts) sang alias `FolderIcon` như trên. Nút "+ Tạo thư mục" (trước đây `disabled`) đã bỏ khỏi P2 — tạo folder mới làm qua trang khác hoặc để P3, tránh thêm một modal mới chỉ cho việc này.

- [ ] **Step 4: Sửa `apps/web/src/components/layout/app-shell.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { Folder } from '@flashcard/contracts';
import { createClient } from '@/lib/supabase/server';
import { apiServer } from '@/lib/api/server';
import { ShellInteractive } from './shell-interactive';
import { SidebarContent } from './sidebar-content';
import { TopbarActions } from './topbar-actions';
import { TopbarSearch } from './topbar-search';

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = user !== null;
  const folders: Folder[] = isLoggedIn ? await apiServer<Folder[]>('/folders') : [];

  return (
    <ShellInteractive
      sidebar={<SidebarContent isLoggedIn={isLoggedIn} folders={folders} />}
      searchBar={<TopbarSearch />}
      actions={<TopbarActions isLoggedIn={isLoggedIn} />}
    >
      {children}
    </ShellInteractive>
  );
}
```

- [ ] **Step 5: Build**

Run: `pnpm --filter @flashcard/web run build`
Expected: thành công, không còn tham chiếu tới `PLACEHOLDER_FOLDERS`.

- [ ] **Step 6: Kiểm chứng bằng tay**

Tạo một folder qua curl (giống Task 12 Step 9), tải lại trang — sidebar hiện đúng tên folder đó, bấm vào mở `/folders/<id>` (trống, vì chưa gán bộ thẻ nào).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/folders apps/web/src/components/layout/app-shell.tsx apps/web/src/components/layout/sidebar-content.tsx apps/web/src/components/layout/nav-data.ts
git commit -m "feat(web): trang folder + noi du lieu folder thuc vao sidebar"
```

---

### Task 22: Hiển thị bộ thẻ công khai trên hồ sơ `/u/[username]`

**Files:**
- Modify: `apps/web/src/app/u/[username]/page.tsx`

- [ ] **Step 1: Sửa `apps/web/src/app/u/[username]/page.tsx`**

Thêm import:

```tsx
import type { PaginatedStudySets } from '@flashcard/contracts';
```

Thay khối cuối cùng (`<Card className="mt-8">...</Card>` chứa `Alert` "Danh sách bộ thẻ sẽ hiện...") bằng:

```tsx
      <PublicStudySets username={profile.username} />
```

Thêm hàm con ở cuối file (Server Component lồng, gọi API riêng để không chặn phần header render):

```tsx
async function PublicStudySets({ username }: { username: string }) {
  const result = await apiRequest<PaginatedStudySets>(
    `/study-sets?ownerUsername=${encodeURIComponent(username)}`,
    { next: { revalidate: 30 } },
  );
  // ...
}
```

**Dừng lại — đây là một lỗ hổng thật trong spec/API đã thiết kế**: endpoint `GET /study-sets` hiện tại chỉ có `mine` (owner = viewer hiện tại) hoặc mặc định public toàn site, **không có cách lọc theo một owner cụ thể khác** (cần cho trang hồ sơ công khai xem bộ thẻ *của người đó*). Phải bổ sung tham số `ownerUsername` vào contract và service trước khi làm bước này.

- [ ] **Step 2: Bổ sung `ownerUsername` vào `listStudySetsQuerySchema`**

Trong `packages/contracts/src/study-set.ts`, thêm field vào `listStudySetsQuerySchema`:

```ts
export const listStudySetsQuerySchema = z.object({
  mine: queryBooleanSchema,
  saved: queryBooleanSchema,
  ownerUsername: z.string().trim().min(1).max(30).optional(),
  q: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(60).optional(),
  sort: sortSchema.optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
```

- [ ] **Step 3: Thêm test cho nhánh `ownerUsername` trong `study-sets.service.spec.ts`**

Thêm vào `describe('StudySetsService.list', ...)`:

```ts
  it('ownerUsername: chi lay bo the PUBLIC cua dung nguoi do, khong lay PRIVATE', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = makeService({ findMany, count: vi.fn().mockResolvedValue(0) });

    await service.list(
      {
        mine: false,
        saved: false,
        ownerUsername: 'an-nguyen',
        sort: 'newest',
        page: 1,
        pageSize: 20,
      },
      undefined,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visibility: 'PUBLIC', owner: { username: 'an-nguyen' } },
      }),
    );
  });
```

- [ ] **Step 4: Chạy test, xác nhận FAIL**

Run: `pnpm --filter @flashcard/api run test`
Expected: FAIL — `listPublic` chưa xử lý `ownerUsername`.

- [ ] **Step 5: Sửa `listPublic` trong `apps/api/src/study-sets/study-sets.service.ts`**

```ts
  private async listPublic(query: ListStudySetsQuery): Promise<PaginatedStudySets> {
    const where: Prisma.StudySetWhereInput = { visibility: 'PUBLIC' };
    if (query.subject) where.subject = query.subject;
    if (query.ownerUsername) where.owner = { username: query.ownerUsername };
```

(Giữ nguyên phần còn lại của method.)

- [ ] **Step 6: Chạy test, xác nhận PASS; build lại contracts + api**

Run: `pnpm --filter @flashcard/contracts run build && pnpm --filter @flashcard/api run test && pnpm --filter @flashcard/api run build`
Expected: PASS, build thành công.

- [ ] **Step 7: Hoàn thiện `PublicStudySets` trong trang hồ sơ**

Thay hàm con nháp ở Step 1 bằng bản đầy đủ:

```tsx
async function PublicStudySets({ username }: { username: string }) {
  const result = await apiRequest<PaginatedStudySets>(
    `/study-sets?ownerUsername=${encodeURIComponent(username)}`,
    { next: { revalidate: 30 } },
  );

  if (result.items.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold">Bộ thẻ công khai</h2>
          <p className="mt-4 text-muted-foreground">Chưa có bộ thẻ công khai nào.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Bộ thẻ công khai</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((set) => (
          <li key={set.id}>
            <Link href={`/sets/${set.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">{set.subject ?? 'Chưa phân loại'}</p>
                  <h3 className="mt-1 font-semibold">{set.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{set.cardCount} thẻ</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Thêm import `Link` nếu file chưa có (đã có `Link` từ `next/link` ở phần đầu file gốc — kiểm tra trước khi thêm trùng).

- [ ] **Step 8: Build web**

Run: `pnpm --filter @flashcard/web run build`
Expected: thành công.

- [ ] **Step 9: Kiểm chứng bằng tay**

Vào `/u/an-nguyen` — thấy đúng các bộ thẻ `PUBLIC` của tài khoản đó, không thấy bộ thẻ `PRIVATE`.

- [ ] **Step 10: Commit**

```bash
git add packages/contracts/src/study-set.ts packages/contracts/src/study-set.test.ts apps/api/src/study-sets/study-sets.service.ts apps/api/src/study-sets/study-sets.service.spec.ts apps/web/src/app/u/[username]/page.tsx
git commit -m "feat: loc bo the theo ownerUsername, hien bo the cong khai tren ho so"
```

---

## Xác minh cuối: chạy toàn bộ test + build trước khi coi Giai đoạn 2 hoàn tất

- [ ] **Bước cuối: chạy full suite**

```bash
pnpm build && pnpm typecheck && pnpm test
```
Expected: tất cả 4 package build/typecheck/test đều PASS, không skip task nào ở trên.

---

## Tự rà soát (đã áp dụng trước khi lưu file)

**Phủ spec**: mọi mục API ở spec mục 3 đều có task tương ứng (StudySets CRUD → Task 6-7-10, Flashcards bulk-replace → Task 8, Upload → Task 11, Folders → Task 12, SavedSets/Reports → Task 9). Quy tắc lỗi mục 4 → Task 5/8. Khung sidebar mục 7 đã triển khai trước, Task 21 chỉ nối dữ liệu thật. Hai điểm KHÔNG có trong bảng API gốc của spec nhưng bắt buộc phải có để tính năng hoạt động đúng — đã bổ sung và ghi rõ lý do: `saved=true` (Task 7, cần cho tab "Đã lưu") và `ownerUsername` (Task 22, cần cho hồ sơ công khai).

**Không còn TBD/placeholder**: đã quét lại toàn bộ — không có "TODO", "tương tự Task N", hay bước thiếu code cụ thể.

**Nhất quán tên/kiểu**: `StudySetDetail`/`StudySetSummary`/`Flashcard`/`Folder`/`FolderDetail` dùng xuyên suốt đúng tên đã định nghĩa ở Task 1-2, không lệch tên ở các task sau. `assertStudySetVisible`/`assertStudySetOwner` (Task 5) được `StudySetsService`, `FlashcardsService`, `SavedSetsService`, `ReportsService` dùng lại đúng chữ ký.
