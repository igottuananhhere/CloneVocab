# Vocab Quiz — web app hoc bang the ghi nho

Monorepo cho mot ung dung hoc flashcard: tao bo the cua rieng ban, hoc theo nhieu che do,
va kham pha bo the cong khai cua nguoi khac.

> San pham lay cam hung tu mo hinh hoc bang the ghi nho noi chung. Khong su dung ten,
> thuong hieu hay noi dung doc quyen cua bat ky dich vu nao khac.

## Kien truc

```
apps/web        Next.js 15 (App Router)  — giao dien, SSR, quan ly session
apps/api        NestJS 11                — toan bo business logic va truy cap du lieu
packages/db     Prisma schema + client   — so huu schema `public`
packages/contracts  Zod schema dung chung web <-> api
packages/config     tsconfig dung chung
supabase/       Cau hinh Supabase CLI (Postgres + Auth + Storage chay local)
```

Ba quyet dinh kien truc dinh hinh moi thu con lai:

1. **Supabase la ha tang, khong phai backend.** Supabase cung cap Postgres, Auth va
   Storage. Toan bo nghiep vu nam o NestJS.
2. **Moi truy cap du lieu di qua NestJS.** Frontend dung `supabase-js` cho DUY NHAT viec
   xac thuc. Anon key khong co quyen doc hay ghi bat ky bang nao — RLS bat o che do tu
   choi tat ca, dong vai tro luoi an toan cuoi. Phan quyen that su nam o tang service cua
   NestJS, mot noi duy nhat.
3. **Prisma so huu schema `public`, GoTrue so huu schema `auth`.** Moi thay doi schema di
   qua `prisma migrate`. Nhung gi Prisma khong dien dat duoc (khoa ngoai sang `auth.users`,
   cot `tsvector`, trigger) nam trong migration SQL viet tay, xem
   `packages/db/prisma/sql/supabase_bindings.sql`.

## Yeu cau moi truong

| Cong cu | Phien ban | Ghi chu                          |
| ------- | --------- | -------------------------------- |
| Node.js | >= 20     | Da kiem tra tren 22 va 24        |
| pnpm    | 9.x       | `corepack enable`                |
| Docker  | dang chay | De Supabase CLI dung stack local |

## Bat dau

```bash
pnpm install

# 1. Dung Postgres + Auth + Storage trong Docker (lan dau se tai image, kha lau)
pnpm supabase:start

# 2. Sinh file .env cho backend va frontend tu thong tin Supabase vua khoi dong
pnpm env:sync

# 3. Tao bang va ap dung cac rang buoc phia database
pnpm db:deploy

# 4. Du lieu mau: hai tai khoan demo va vai bo the
pnpm db:seed

# 5. Chay web (3000) va api (4000) song song
pnpm dev
```

Tai khoan demo sau khi seed: `an@example.com` / `binh@example.com`, mat khau
`Password123!`.

Dia chi huu ich khi dev:

| Dich vu           | URL                            |
| ----------------- | ------------------------------ |
| Web               | http://localhost:3000          |
| API               | http://localhost:4000/api/v1   |
| Supabase Studio   | http://127.0.0.1:54323         |
| Hop thu thu (Inbucket) | http://127.0.0.1:54324    |
| Prisma Studio     | `pnpm db:studio`               |

## Lenh thuong dung

| Lenh                 | Tac dung                                              |
| -------------------- | ----------------------------------------------------- |
| `pnpm dev`           | Chay web + api (turbo tu build cac package phu thuoc) |
| `pnpm build`         | Build toan bo workspace                                |
| `pnpm test`          | Unit test (Vitest) o moi package                       |
| `pnpm typecheck`     | Kiem tra kieu toan workspace                           |
| `pnpm db:migrate`    | Tao migration moi tu thay doi trong schema.prisma      |
| `pnpm db:deploy`     | Ap dung cac migration da co                            |
| `pnpm db:reset`      | Xoa sach schema public, chay lai migration va seed     |
| `pnpm env:sync`      | Ghi lai `.env` va `apps/web/.env.local` tu Supabase    |
| `pnpm supabase:stop` | Tat stack Docker                                       |

## Bien moi truong

Co hai file, chu y dung cho hai muc dich khac nhau:

- **`.env`** o thu muc goc — backend, Prisma CLI va script seed. Chua bi mat
  (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`).
- **`apps/web/.env.local`** — Next.js. Chi chua bien `NEXT_PUBLIC_*`, tat ca deu duoc
  nhung vao bundle gui xuong trinh duyet. **Khong bao gio dat bi mat o day.**

`pnpm env:sync` sinh ca hai file tu output cua `supabase status`. Xem `.env.example` va
`apps/web/.env.example` de biet y nghia tung bien.

## Dang nhap bang Google

Mac dinh tat. Dang nhap bang email/mat khau chay binh thuong ma khong can lam gi o day.

De bat o local — chi sua file `.env`, khong dung toi `supabase/config.toml`:

1. Tren [Google Cloud Console](https://console.cloud.google.com/apis/credentials), tao
   **OAuth client ID** loai *Web application*, them **Authorized redirect URI**:

   ```
   http://127.0.0.1:54321/auth/v1/callback
   ```

2. Dien ba bien nay vao `.env` o thu muc goc:

   ```dotenv
   GOOGLE_OAUTH_ENABLED=true
   GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
   GOOGLE_SECRET="GOCSPX-..."
   ```

3. Khoi dong lai stack de Auth nap cau hinh moi:

   ```bash
   pnpm supabase:stop && pnpm supabase:start
   ```

`GOOGLE_OAUTH_ENABLED` phai luon la `true` hoac `false`. De trong hoac xoa han bien nay se
lam `supabase start` bao `ProjectConfigParseError` — `supabase/config.toml` doc thang gia
tri do. `pnpm env:sync` giu nguyen ca ba bien khi sinh lai file `.env`.

Khi luong OAuth that bai, `/auth/callback` dieu huong ve `/login?error=...` va trang dang
nhap hien dung thong bao do — khong nuot loi.

### Tren production

Redirect URI cua Google doi thanh `https://<project-ref>.supabase.co/auth/v1/callback`, va
Client ID / Secret duoc dat trong **Authentication → Providers → Google** cua Supabase
dashboard (khong phai qua `.env`). Nho them domain Netlify vao muc **URL Configuration →
Redirect URLs**, neu khong Supabase se tu choi dieu huong nguoc ve trang web.

## Deploy

- **apps/web** len Netlify. Cau hinh o `netlify.toml`; dat cac bien `NEXT_PUBLIC_*` trong
  phan Environment variables cua Netlify.
- **apps/api** dong goi bang `apps/api/Dockerfile` (build tu thu muc goc monorepo) va
  deploy len Railway. Dat cac bien trong `.env.example` — tru `SUPABASE_JWT_SECRET`, de
  trong bien nay khi dung project Supabase cloud ky JWT bang khoa bat doi xung.
- **Database**: mot project Supabase cloud. Chay `pnpm db:deploy` voi `DATABASE_URL` tro
  toi project do.

## Trang thai

Giai doan 1 (nen mong) da hoan thanh: monorepo, schema day du cho ca MVP, dang ky/dang
nhap, ho so ca nhan va ho so cong khai.

Giai doan 2 dang trien khai tung phan:
- **Quan ly bo the (xong)**: API `StudySets` (CRUD bo the + the, kiem tra quyen va
  visibility), form tao/sua bo the, trang chi tiet `/sets/[id]`, va danh sach bo the that
  tren `/dashboard` (bo the cua ban) va `/u/[username]` (bo the cong khai).
- **Upload anh** va **Explore/tim kiem**: dang tiep tuc (trang `/explore` van la khung).

Giai doan 3 (bon che do hoc, thong ke) dang hoan thien:
- **Bon che do hoc**: Thẻ ghi nhớ (lật), Học lại ngắt quãng (spaced repetition theo
  masteryLevel + nextReviewAt, thuật toán nằm tại `StudyService`), Kiểm tra (trắc nghiệm /
  tự luận / đúng-sai, sinh đề xác định để API tự chấm), Ghép cặp (tính giờ, lưu kỷ lục).
- **Thong ke**: API `/study/stats` tổng hợp thẻ đã học, đã thuộc, cần ôn hôm nay, số lượt
  kiểm tra và kỷ lục ghép cặp; hiển thị trên `/dashboard`.

Con lai:
- **Upload ảnh** cho thẻ và **Explore / tìm kiếm toàn văn**: chưa làm (trang `/explore`
  vẫn là khung; trường `imagePath` đã có sẵn nhưng form tạo bộ thẻ chưa dùng).
- **Thư mục (Folders)**: API chưa code, sidebar vẫn dùng dữ liệu minh họa.
