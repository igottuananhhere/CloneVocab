# Thebai — Giai doan 1: Nen mong

Ngay: 2026-08-23
Trang thai: Da trien khai

## 1. Boi canh

Xay dung mot web app hoc bang the ghi nho: nguoi dung tu dang ky, tu tao bo the, hoc theo
bon che do (Flashcards, Learn, Test, Match), va kham pha bo the cong khai cua nguoi khac.
San pham lay cam hung tu mo hinh flashcard noi chung; khong dung ten, thuong hieu hay noi
dung doc quyen cua bat ky dich vu nao khac.

Yeu cau ban dau chua hai mo ta ky thuat mau thuan nhau: mot ben doi monorepo pnpm voi
NestJS + Prisma, mot ben chi dinh kien truc Supabase-only khong co backend rieng. Mau
thuan nay da duoc dua ra va giai quyet truoc khi thiet ke.

## 2. Cac quyet dinh kien truc

### 2.1 Hybrid: monorepo co backend that, Supabase lam ha tang

Da chon phuong an ket hop:

- Monorepo pnpm voi `apps/web` (Next.js) va `apps/api` (NestJS), Prisma lam ORM.
- Supabase cung cap Postgres, Auth (GoTrue) va Storage — khong tu dung lai ba thu nay.

Cac phuong an bi loai:

| Phuong an          | Ly do loai                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- |
| Monorepo thuan     | Phai tu viet auth (JWT, refresh, Google OAuth) va storage — them khoang mot tuan cong  |
| Supabase-only      | Bo han phan monorepo/NestJS ma yeu cau doi hoi                                          |

### 2.2 Moi truy cap du lieu di qua NestJS

Frontend dung `supabase-js` cho duy nhat viec xac thuc: dang nhap, dang ky, doc va lam moi
session. Moi thao tac doc-ghi du lieu deu goi REST API cua NestJS kem access token.

He qua truc tiep: phan quyen chi ton tai o mot noi — tang service cua NestJS. Phuong an
"doc thang tu Supabase, ghi qua API" bi loai vi no dat logic phan quyen doc vao RLS va
logic phan quyen ghi vao NestJS; hai ban quy tac song song la hai ban quy tac se lech nhau.

Cai gia phai tra: SSR ton them mot hop mang (Next server -> NestJS). Chap nhan duoc, va
doi lai duoc mot mo hinh de suy luan va de kiem thu.

### 2.3 Ranh gioi so huu schema

- **GoTrue** so huu schema `auth`. Prisma khong mo hinh hoa, khong dung toi.
- **Prisma** so huu schema `public`. Moi thay doi qua `prisma migrate`; khong dung
  `supabase migration` de hai cong cu khong tranh nhau mot database.
- Nhung gi Prisma khong dien dat duoc nam trong mot migration SQL viet tay
  (`packages/db/prisma/sql/supabase_bindings.sql`), duoc sao chep vao thu muc migration va
  chay cung cac migration khac:
  - Khoa ngoai `profiles.id -> auth.users.id` (ON DELETE CASCADE).
  - Trigger `handle_new_user()`: tu tao `profiles` khi co tai khoan moi, username suy tu
    email, them hau to so neu trung.
  - Cot `search_vector` dang GENERATED tsvector + index GIN, cau hinh `simple` (Postgres
    khong co stemmer tieng Viet).
  - Trigger dong bo `study_sets.card_count`.
  - Bat RLS tren moi bang ma khong khai bao policy nao, va thu hoi quyen cua `anon` /
    `authenticated`.

### 2.4 RLS la luoi an toan, khong phai co che phan quyen

Prisma ket noi bang role so huu bang nen khong bi RLS chan. Anon key thi khong doc duoc gi:
da kiem chung bang PostgREST, tra ve `42501 permission denied`. Neu anon key bi lo, no
khong mo duoc canh cua nao.

### 2.5 Google OAuth bat bang mot bien moi truong

`supabase/config.toml` doc ca ba gia tri cua provider Google tu `.env`, ke ca truong
`enabled`:

```toml
[auth.external.google]
enabled = "env(GOOGLE_OAUTH_ENABLED)"
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_SECRET)"
```

Da kiem chung rang Supabase CLI tu nap `.env` o thu muc goc va parse `enabled` thanh
boolean that (gia tri khong hop le gay `ProjectConfigParseError`). Nho vay bat/tat Google
khong doi den mot file cau hinh nao trong git — chi doi bien moi truong, dung nhu cach
credential duoc quan ly o production.

Danh doi: `GOOGLE_OAUTH_ENABLED` tro thanh bien bat buoc. Thieu no thi `supabase start`
that bai. Chap nhan duoc vi `pnpm env:sync` luon sinh ra bien nay, va thong bao loi cua
CLI chi thang vao file cau hinh.

### 2.6 Xac thuc JWT tu nhan dien thuat toan

Supabase ky access token bang HS256 (project cu) hoac ES256/RS256 qua JWKS (mac dinh hien
nay, ke ca ban CLI chay local). Guard doc truong `alg` trong header cua chinh token roi
chon duong xac thuc, thay vi doc cau hinh. Nho vay viec Supabase doi khoa ky khong lam gay
API, va giai doan chuyen tiep khi hai loai token ton tai song song van chay dung.

Gia dinh ban dau — "local thi luon la HS256" — da sai trong thuc te va duoc phat hien khi
kiem thu end-to-end.

## 3. Cau truc

```
apps/web            Next.js 15 App Router — UI, SSR, session
apps/api            NestJS 11 — business logic, truy cap du lieu
packages/db         Prisma schema, migrations, client singleton, seed
packages/contracts  Zod schema dung chung web <-> api
packages/config     tsconfig dung chung
supabase/           config.toml cho Supabase CLI local
scripts/sync-env.mjs  Sinh .env va apps/web/.env.local tu `supabase status`
```

`packages/contracts` la truc chinh cua thiet ke: Zod schema dinh nghia mot lan, NestJS
dung de validate request, Next.js suy type tu chinh schema do. Sai lech giua hai phia tro
thanh loi bien dich chu khong phai loi runtime.

## 4. Data model

Toan bo schema cho ca MVP duoc khai bao ngay o giai doan 1, ke ca cac bang chi dung o giai
doan 2 va 3. Ly do: doi schema sau khi da co du lieu that dat hon nhieu so voi viec khai
bao som vai bang chua dung toi.

| Bang                | Vai tro                                                        |
| ------------------- | -------------------------------------------------------------- |
| `profiles`          | Ho so cong khai, id trung `auth.users.id`                        |
| `study_sets`        | Bo the: title, description, subject, language, visibility, FTS   |
| `flashcards`        | The hai mat, co `position` va `image_path`                       |
| `folders`, `folder_study_sets` | Gom nhom bo the ca nhan                               |
| `saved_sets`        | Bo the nguoi khac ma nguoi dung danh dau                         |
| `study_progress`    | Loi cua spaced repetition, unique theo (user, flashcard)         |
| `test_results`      | Ket qua bai Test, chi tiet tung cau trong cot jsonb              |
| `match_results`     | Ky luc Match tinh bang mili giay                                 |
| `content_reports`   | Bao cao noi dung vi pham                                         |

Hai lua chon dang chu y:

- `study_sets.card_count` la du lieu phi chuan hoa, do trigger trong database giu dong bo.
  Trang Explore liet ke hang tram bo the va khong nen COUNT tren bang `flashcards` moi lan.
  Dat trach nhiem dong bo o database vi con nhieu duong ghi khac ngoai API (seed, sua tay,
  xoa cascade).
- `flashcards.image_path` luu duong dan trong Storage chu khong luu URL day du, de doi
  bucket hay domain sau nay khong phai migrate du lieu.

## 5. Xu ly loi

Moi loi thoat ra khoi API deu mang cung hinh dang `ApiError` dinh nghia trong
`@flashcard/contracts`: `statusCode`, `error`, `message`, `details?`, `path`, `timestamp`.
Frontend chi can mot ham xu ly loi duy nhat.

- `ZodValidationPipe` doi loi Zod thanh 400 kem `details` la map `field -> danh sach loi`,
  du de form hien thi loi dung tung o nhap.
- `AllExceptionsFilter` doi ma loi Prisma thanh HTTP status dung nghia (P2002 -> 409,
  P2025 -> 404, P2003 -> 400) thay vi de tat ca thanh 500.
- Loi khong luong truoc chi lo status 500 va mot cau chung chung; chi tiet ghi vao log
  server de khong ro ri cau truc database.
- Guard khong noi ro token sai vi ly do gi. Voi nguoi goi hop le thi thong tin do vo ich,
  voi ke tan cong thi la thong tin mien phi. Ly do that duoc ghi o muc log debug.

## 6. Bao mat

- Guard dang ky toan cuc: **mac dinh moi endpoint deu doi dang nhap**. Mo route ra cong
  khai la hanh dong co y thuc bang `@Public()`. Quen gan guard khong bao gio lam ro ri
  du lieu.
- Route `@Public` van co gang giai ma token neu co, de handler biet nguoi goi la ai.
- Middleware cua Next dung `getUser()` chu khong phai `getSession()`: `getSession()` chi
  doc cookie va tin noi dung ben trong, ma cookie thi client sua duoc.
- Dang xuat qua POST, khong phai GET.
- Tham so `?next=` bi loc qua `resolveSafeNext()` truoc moi lan dieu huong, o ca
  `/auth/callback` lan form dang nhap (`router.push()` nhan ca URL tuyet doi). Ham nay la
  mot don vi thuan, co 17 test rieng: chan URL tuyet doi, `//host`, `/\host`,
  `javascript:`, duong dan tuong doi va ky tu dieu khien.
- Hai file bien moi truong tach bach: `.env` (bi mat, backend) va `apps/web/.env.local`
  (chi `NEXT_PUBLIC_*`, deu di xuong trinh duyet).

## 7. UI/UX

- Mobile-first. Nut chinh cao 44px, dat khuyen nghi vung cham.
- Dark mode qua `next-themes` theo class, ba trang thai: sang / toi / theo he thong.
- Bang mau dat qua bien CSS, moi mau khai bao mot lan cho sang va mot lan cho toi. Tuong
  phan chu/nen dat WCAG AA.
- Vien focus luon nhin thay duoc; co lien ket "bo qua den noi dung chinh".
- Component `Field` gom label, o nhap, goi y va thong bao loi thanh mot khoi co lien ket
  `aria-describedby` day du, de khong form nao quen.
- Ton trong `prefers-reduced-motion`.

## 8. Kiem thu

Ba tang, moi tang tra loi mot cau hoi khac nhau:

- **Unit (Vitest)** — 51 test. `packages/contracts` kiem tra quy tac username va ngu nghia
  "null nghia la xoa, khong gui nghia la giu nguyen". `apps/api` kiem tra phan quyen
  username va viec ho so cong khai khong lo email. `apps/web` kiem tra tang goi API va bo loc open redirect.
- **Kiem chung tich hop thu cong** — da chay va xac nhan: health, 401 khi khong token, 401
  khi token bi sua, 200 voi token that cua hai tai khoan khac nhau, 409 khi trung username,
  409 khi username trung duong dan he thong, 400 khi username sai dinh dang, 404 khi khong
  co ho so, PostgREST tu choi anon key, trigger card_count, cot tsvector, khoa ngoai sang
  `auth.users`, SSR trang cong khai, redirect trang can dang nhap.
- **E2E (Playwright)** — de o giai doan sau, khi da co luong tao bo the va hoc de kiem.

## 9. Pham vi giai doan 1

Da lam:

- Monorepo pnpm + Turborepo, ba package dung chung.
- Supabase CLI local (Docker), script sinh bien moi truong tu dong.
- Prisma schema day du cho ca MVP, hai migration, seed hai tai khoan demo va ba bo the.
- Dang ky / dang nhap bang email + mat khau. Google OAuth da noi day du duong day,
  bat bang mot bien moi truong khi co credential.
- API: health, ho so ca nhan (doc, sua), ho so cong khai, kiem tra username con trong.
- Web: landing, dang nhap, dang ky, dashboard, cai dat, ho so cong khai `/u/[username]`,
  404, error boundary, dark mode.
- Netlify config cho web, Dockerfile cho api.

Chua lam, danh cho giai doan sau:

- **Giai doan 2** — CRUD bo the va the, upload anh len Storage, folder, trang Explore voi
  full-text search, danh sach bo the tren trang ho so cong khai, nut bao cao noi dung.
- **Giai doan 3** — bon che do hoc, thuat toan spaced repetition, dashboard thong ke.
- Ngoai MVP: AI sinh the, che do Live, lop hoc, tinh nang xa hoi, import file.

Cac trang `/explore`, `/dashboard` va `/u/[username]` hien co khung va noi dung tam, ghi ro
phan nao se duoc noi voi du lieu that o giai doan nao.
