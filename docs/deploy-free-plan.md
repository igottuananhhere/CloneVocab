# Vocab Quiz — Đọc hiểu dự án & Phương án deploy / backend miễn phí

**Ngày:** 04/09/2026 · **Repo:** `igottuananhhere/CloneVocab` (branch `main`, commit `d4ebadb`)
**Nguồn:** đọc trực tiếp toàn bộ monorepo tại `D:\Website clone quizlet`

---

## 1. Business Context & Business Question

### Bối cảnh
Bạn đang có một web app học flashcard (mô hình tương tự Quizlet) đã chạy được ở local qua
Docker + Supabase CLI, nhưng **muốn thoát khỏi sự phụ thuộc vào máy dev**.

### Câu hỏi kinh doanh
> "Làm sao để website luôn truy cập được từ bất kỳ máy nào, không phải mở VS Code chạy
> `pnpm dev`, và chi phí bằng 0?"

### Yêu cầu đã xác nhận
| Yêu cầu | Giá trị |
|---|---|
| Đối tượng dùng | Cá nhân trước (1 người), có thể mở rộng sau |
| Tính khả dụng | **Luôn online** — mở máy khác, mở điện thoại là vào được |
| Ràng buộc "không chạy local" | Bắt buộc. Không được yêu cầu bật Docker/VS Code |
| Kiến trúc | **Giữ NestJS là service riêng** (đúng ADR của dự án) |
| Ngân sách | 0 đồng |

### KPI đo thành công
1. **Uptime cảm nhận** — mở URL bất kỳ lúc nào, trang đầu tiên trả về < 3s.
2. **Zero-touch** — không thao tác thủ công nào để website sống (trừ redeploy khi đổi code).
3. **Chi phí thực tế** = 0 VNĐ/tháng.
4. **Không mất dữ liệu** — DB không bị pause/xóa vì "không hoạt động".

---

## 2. Đọc hiểu dự án

### 2.1 Kiến trúc thực tế (đã xác minh bằng code, không phải theo README)

```
apps/web        Next.js 15.1 App Router + React 19 + Tailwind 4
                → SSR, quản lý session Supabase qua middleware
                → gọi NestJS qua apiRequest() (một cửa duy nhất: lib/api/request.ts)

apps/api        NestJS 11 + Prisma 6 + Zod
                → 6 module nghiệp vụ: profiles, study-sets, study, folders, uploads, health
                → 29 endpoint dưới prefix /api/v1
                → Guard toàn cục SupabaseAuthGuard: mặc định ĐÓNG, mở bằng @Public()

packages/db     Prisma schema (sở hữu toàn bộ schema `public`) + PrismaClient singleton
packages/contracts  Zod schema dùng chung web ↔ api (12 file, có unit test)
packages/config     tsconfig base

supabase/       Cấu hình Supabase CLI (chỉ dùng cho local dev)
```

### 2.2 Ba quyết định kiến trúc chi phối mọi phương án deploy

1. **Supabase = hạ tầng, không phải backend.** Chỉ dùng Postgres + Auth (GoTrue) + Storage.
   Frontend dùng `supabase-js` **duy nhất để xác thực**. RLS bật ở chế độ từ chối tất cả.
2. **Mọi truy cập dữ liệu đi qua NestJS.** Anon key không đọc/ghi được bảng nào.
   → **Hệ quả deploy: NestJS là single point of failure. API chết = cả web chết**, kể cả
   trang tĩnh vì SSR gọi API server-side (`lib/api/server.ts`).
3. **Prisma sở hữu `public`, GoTrue sở hữu `auth`.** Ràng buộc cross-schema, cột
   `tsvector` GENERATED, và 2 trigger (`handle_new_user`, `sync_study_set_card_count`)
   nằm trong migration SQL tay `20260823111400_supabase_bindings`.
   → **Hệ quả deploy: bắt buộc chạy `prisma migrate deploy`**, không thể chỉ push schema.

### 2.3 Xác thực — điểm thiết kế tốt, giúp deploy dễ

`SupabaseJwtService` chọn cách verify **dựa vào field `alg` trong header của chính token**,
không dựa vào cấu hình:
- `HS*` → verify bằng `SUPABASE_JWT_SECRET`
- còn lại → verify bằng JWKS tải từ `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`

→ Với Supabase Cloud (khóa bất đối xứng), **để trống `SUPABASE_JWT_SECRET`** là chạy đúng.
Không cần sửa code khi chuyển local → cloud.

### 2.4 Storage — tự khởi tạo, không cần thao tác tay

`SupabaseAdminService.onModuleInit()` tự kiểm tra và tạo bucket `flashcard-images`
(public, giới hạn 5MB, whitelist webp/jpeg/png) bằng service role key.
→ Deploy lên cloud, bucket tự sinh ở lần khởi động đầu. Không cần vào dashboard tạo tay.

### 2.5 Trạng thái hoàn thiện

| Hạng mục | Trạng thái |
|---|---|
| Monorepo, schema đầy đủ MVP, đăng ký/đăng nhập, hồ sơ công khai | ✅ Xong (P1) |
| CRUD bộ thẻ + thẻ, kiểm tra quyền & visibility | ✅ Xong (P2) |
| Explore + full-text search, bookmark bộ thẻ | ✅ Xong |
| Thư mục (Folders) — API `folders` 9 endpoint | ✅ Xong |
| 4 chế độ học: Thẻ ghi nhớ, Học lại ngắt quãng, Kiểm tra, Ghép cặp | ✅ Xong (P3) |
| Thống kê `/study/stats` trên dashboard | ✅ Xong |
| Upload ảnh flashcard (signed upload URL, nén ảnh client-side) | ✅ Xong (P4) |

**Kết luận: dự án đã đủ hoàn chỉnh để deploy production.** README ở mục "Trạng thái" đã
lạc hậu so với code (nó nói upload ảnh và folders "chưa làm", nhưng commit `bc2ff8d` và
`e95bd9a` đã hoàn thành cả hai).

### 2.6 Dấu hiệu bạn đã thử deploy trước đó

- Commit `e2bebcd`, `d4ebadb`: thêm `build:api` / `start:api` **cho Render**
  → đã có script deploy không-Docker sẵn: `pnpm build:api` rồi `pnpm start:api`.
- Commit `d3f6eea`: xử lý lỗi kết nối backend trên dashboard
  → bạn đã gặp đúng vấn đề "API chết thì dashboard vỡ".
- `.env.production.local` đã trỏ tới project Supabase Cloud `xzaxbkflmqnsaltjyigu`,
  region **`ap-southeast-1` (Singapore)**, dùng **Session pooler** cho cả `DATABASE_URL`
  và `DIRECT_URL` — vì Direct connection chỉ có IPv6 và máy bạn không có đường IPv6.

→ **Ghi nhận quan trọng:** phát hiện IPv6 này của bạn là chính xác và sẽ lặp lại trên
mọi nền tảng free (Render, Koyeb, Cloud Run đều đi ra bằng IPv4). **Phải dùng pooler host,
tuyệt đối không dùng `db.<ref>.supabase.co`.**

---

## 3. Available Data / Missing Data

### Đã có trong tay
- Toàn bộ source code, migration, Dockerfile, netlify.toml
- Project Supabase Cloud đã tồn tại, region Singapore, connection string đã kiểm chứng
- Repo GitHub công khai để nền tảng CI/CD kéo code

### Còn thiếu (cần bạn xác nhận hoặc quyết định)
| Thiếu | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Migration đã chạy trên project cloud chưa? | Cao — app sẽ 500 nếu thiếu bảng | Bước 1 runbook |
| Có sẵn thẻ tín dụng để verify không? | Trung bình — quyết định chọn Render vs Cloud Run/Koyeb | Phương án A không cần thẻ |
| Có cần Google OAuth trên production? | Thấp — email/password chạy độc lập | Bước 7 (tùy chọn) |
| Có domain riêng? | Thấp — subdomain nền tảng dùng được | Bỏ qua |

---

## 4. Ràng buộc quyết định — 5 sự thật về hạ tầng free (tháng 9/2026)

Đây là phần quyết định mọi thứ. Bốn trong năm điều này là **cạm bẫy** khiến hầu hết
hướng dẫn "deploy free" trên mạng thất bại với chính dự án này.

### Sự thật 1 — Supabase Free tự pause sau 7 ngày ít hoạt động
Project bị pause khi "hoạt động thấp trong 7 ngày". Dữ liệu **không mất** và có thể
restore trong vòng 1 năm, nhưng phải bấm "Resume project" bằng tay.
> **Với người dùng cá nhân, đây là rủi ro số 1**: đi công tác 10 ngày, quay về website
> chết. Chỉ cần "vài request tới database mỗi ngày" là đủ để không bị pause.

Giới hạn Free plan khác: 500 MB DB · 1 GB Storage · 5 GB egress · 50.000 MAU · 2 project.

### Sự thật 2 — Render Free ngủ sau 15 phút, nhưng 750 giờ/tháng ≈ 24/7
- Web service free **spin down sau 15 phút không có traffic vào**, khởi động lại mất ~1 phút.
- Mỗi workspace được **750 instance hours/tháng**; hết thì service bị suspend tới tháng sau.

> **Phép tính then chốt:** 31 ngày × 24 giờ = **744 giờ < 750 giờ**.
> Nghĩa là **một** service free có thể chạy 24/7 nguyên tháng và vẫn trong hạn mức —
> miễn là có gì đó ping nó để không bị spin down.

Render có region **Singapore** — cùng vùng với project Supabase của bạn.

### Sự thật 3 — Fly.io đã bỏ free allowance
Không còn là lựa chọn. Railway cũng đã bỏ free tier (chỉ còn credit dùng thử).

### Sự thật 4 — Koyeb có 1 service free KHÔNG ngủ, nhưng lệch vùng
Koyeb Free: 1 web service (512MB RAM, 0.1 vCPU, 2GB SSD), **không tự scale-to-zero**
→ always-on thật, không cần keep-alive. Nhưng:
- Chỉ có region **Frankfurt** hoặc **Washington D.C.** → cách DB Singapore ~180–250ms.
  Prisma thường chạy 2–5 query/request → cộng dồn thành 0.5–1.2s mỗi request. Rất tệ.
- Yêu cầu **thẻ tín dụng** + giữ tạm (pre-authorization) $29 để xác thực.

### Sự thật 5 — Cloud Run free tier lớn và cold start nhanh hơn Render nhiều
Always-free mỗi tháng: **2 triệu request**, 180.000 vCPU-giây, 360.000 GiB-giây, 1 GiB egress.
Có region `asia-southeast1` (Singapore). Scale-to-zero nhưng cold start của NestJS+Prisma
chỉ khoảng **3–8 giây** thay vì ~60 giây như Render. Cần tài khoản GCP + thẻ (không bị
trừ tiền nếu ở trong hạn mức free).

---

## 5. Analysis — So sánh phương án

| | **A. Render Singapore + keep-alive** | **B. Cloud Run asia-southeast1** | **C. Koyeb always-on** |
|---|---|---|---|
| Chi phí | 0 | 0 (trong hạn mức) | 0 |
| Cần thẻ tín dụng | **Không** | Có | Có (+ giữ tạm $29) |
| Cùng vùng với DB Singapore | ✅ | ✅ | ❌ (FRA/US) |
| Latency DB mỗi query | ~1–5ms | ~1–5ms | ~180–250ms |
| Ngủ / cold start | Ngủ sau 15′, ~60s — **triệt tiêu bằng ping** | Cold start 3–8s | Không ngủ |
| Giới hạn giờ | 750h/tháng (đủ 24/7, margin mỏng) | Không giới hạn giờ | Không giới hạn |
| Deploy từ Dockerfile | ✅ (hoặc dùng `build:api` sẵn có) | ✅ | ✅ |
| Độ phức tạp thiết lập | **Thấp** (giao diện, 10 phút) | Trung bình (gcloud CLI, IAM) | Thấp |
| Rủi ro chính | Hết 750h nếu ping quá dày + redeploy nhiều | Vượt free nếu bị crawl/spam | Latency DB làm app chậm rõ rệt |

### Insight
Ba phương án đều free, nhưng **thứ phân biệt chúng không phải giá — mà là khoảng cách
tới database Singapore của bạn.** Kiến trúc "mọi truy cập dữ liệu đi qua NestJS" khiến
mỗi request người dùng nở ra thành nhiều query Prisma; đặt API xa DB là nhân số đó với
độ trễ xuyên lục địa. Đây là lý do Koyeb — nghe hấp dẫn nhất vì "không ngủ" — lại là
lựa chọn tệ nhất ở đây, trừ khi bạn migrate Supabase sang Frankfurt.

### Business Impact
- Phương án A: trải nghiệm gần như always-on, thiết lập 1 buổi tối, không cần thẻ.
  → **Khớp chính xác với yêu cầu "dùng cá nhân, luôn vào được, không phải chạy local".**
- Phương án B: tốt nhất khi có người dùng thật (không phụ thuộc ping, không giới hạn giờ).
- Phương án C: chỉ nên chọn nếu bạn chấp nhận migrate Supabase sang Frankfurt/US.

---

## 6. Recommendation — Kiến trúc production đề xuất

```
┌──────────────────────────────────────────────────────────────────┐
│  Netlify (Free)                      apps/web — Next.js 15       │
│  https://<ten-site>.netlify.app      SSR + middleware session    │
└───────────────┬──────────────────────────────────────────────────┘
                │  fetch  ${NEXT_PUBLIC_API_URL}/api/v1/*
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  Render Free — region Singapore      apps/api — NestJS 11        │
│  https://<ten-api>.onrender.com      Guard JWKS, Prisma          │
└───────────────┬──────────────────────────────────────────────────┘
                │  Session pooler, IPv4, aws-0-ap-southeast-1
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  Supabase Free — ap-southeast-1                                  │
│  Postgres (schema public) · Auth GoTrue · Storage flashcard-images│
└──────────────────────────────────────────────────────────────────┘
                ▲
                │  GET /api/v1/health mỗi 10 phút (06:00–24:00)
┌───────────────┴──────────────────────────────────────────────────┐
│  cron-job.org (Free) — MỘT cron giải quyết HAI vấn đề:           │
│   1. Render không spin down                                       │
│   2. /health chạy SELECT 1 → Supabase không bị pause 7 ngày       │
└──────────────────────────────────────────────────────────────────┘
```

**Điểm thanh lịch nhất của thiết kế này:** endpoint `/api/v1/health` có sẵn trong code
đã thực hiện `SELECT 1` tới Postgres. Vì vậy **một** cron ping duy nhất vừa giữ Render
thức, vừa tạo "hoạt động database" mà Supabase cần để không pause. Không phải viết thêm
gì, không phải dựng thêm dịch vụ.

---

## 7. ⚠️ Phải sửa trong code TRƯỚC khi deploy

Đọc kỹ Dockerfile và lockfile, tôi tìm được **3 lỗi sẽ làm build thất bại** và 2 điểm
cần chú ý. Đây không phải suy đoán — đã đối chiếu với `pnpm-lock.yaml` và `.npmrc`.

### Lỗi 1 (chắc chắn vỡ) — deps stage thiếu `apps/web/package.json`

`pnpm-lock.yaml` khai báo 5 importer: `apps/api`, `apps/web`, `packages/config`,
`packages/contracts`, `packages/db`. Nhưng `apps/api/Dockerfile` chỉ copy 4 file
package.json, **thiếu `apps/web`**. Trong khi `pnpm-workspace.yaml` khai `apps/*`.

→ `pnpm install --frozen-lockfile` sẽ báo *"Cannot install with frozen-lockfile because
pnpm-lock.yaml is not up to date"* và build chết.

**Fix:** thêm vào deps stage
```dockerfile
COPY apps/web/package.json ./apps/web/
```

### Lỗi 2 (chắc chắn vỡ) — `prisma generate` chạy khi chưa có schema

`packages/db/package.json` có `"postinstall": "prisma generate"`, và `.npmrc` **không**
đặt `ignore-scripts`. Ở deps stage, `prisma/schema.prisma` chưa được copy vào image
→ `prisma generate` không tìm thấy schema → postinstall fail → install fail.

**Fix:** copy thư mục prisma vào deps stage, **trước** khi install
```dockerfile
COPY packages/db/prisma ./packages/db/prisma
RUN pnpm install --frozen-lockfile
```

### Lỗi 3 (vỡ khi build local, an toàn trên cloud) — thiếu `.dockerignore`

Build stage dùng `COPY . .`. Không có `.dockerignore` → `node_modules` của Windows
(binary sai nền tảng, hàng trăm MB) sẽ đè lên `node_modules` đã cài trong container.
Trên Render/Cloud Run thì build context lấy từ git clone nên `node_modules` không có mặt
(đã gitignore) — nhưng vẫn nên thêm để build local chạy được và giảm build context.

**Fix:** tạo `.dockerignore` ở thư mục gốc
```
node_modules
**/node_modules
.next
dist
.turbo
.git
.env
.env.*
!.env.example
.worktrees
coverage
supabase/.branches
supabase/.temp
```

### Chú ý 4 — `pnpm prune --prod` có thể xóa Prisma Client đã sinh

Build stage chạy `pnpm prune --prod` sau khi build. `@prisma/client` là dependency
production của `packages/db` nên **có khả năng cao** artifact sinh ra vẫn còn, nhưng
`prisma` CLI (devDependency) thì bị xóa. Để chắc chắn, đảo thứ tự — generate lại **sau**
khi prune không được (CLI đã mất), nên cách an toàn là **prune trước rồi copy artifact**,
hoặc đơn giản nhất: **bỏ `pnpm prune --prod`**. Image to hơn ~100MB nhưng không vỡ.

> Mức tin cậy: trung bình. Nếu build thành công và runtime báo
> *"@prisma/client did not initialize yet"* thì đây chính là nguyên nhân.

### Chú ý 5 — `DIRECT_URL` phải có ở runtime

`schema.prisma` khai `directUrl = env("DIRECT_URL")`. Biến này chỉ dùng cho migrate,
nhưng Prisma validate datasource khi khởi tạo client → **phải set cả `DATABASE_URL` và
`DIRECT_URL`** trên Render, kể cả khi giá trị giống nhau.

### Nếu muốn bỏ hẳn Docker
Bạn đã có sẵn script cho Render ở commit `e2bebcd`/`d4ebadb`:
- Build command: `pnpm install --frozen-lockfile && pnpm build:api`
- Start command: `pnpm start:api`

Đường này **bỏ qua được cả 3 lỗi trên** vì không dùng Dockerfile. Với Render đây là lựa
chọn đơn giản hơn. Chỉ giữ Dockerfile nếu sau này chuyển sang Cloud Run.

---

## 8. Runbook — từng bước

### Bước 0 — Chuẩn bị (5 phút)
```bash
# Ở thư mục gốc dự án
git checkout main
git pull

# Xác nhận project Supabase Cloud còn sống, không bị pause
# → mở https://supabase.com/dashboard, nếu thấy "Paused" thì bấm "Resume project"
```

### Bước 1 — Đẩy schema lên Supabase Cloud
`.env.production.local` của bạn đã trỏ đúng tới project cloud. Chạy:
```bash
pnpm db:deploy:prod
```
Kỳ vọng: 2 migration được áp dụng (`20260823111333_init`,
`20260823111400_supabase_bindings`).

Kiểm chứng — vào Supabase Dashboard → SQL Editor:
```sql
-- Phải trả về 10 bảng nghiệp vụ (+ _prisma_migrations): profiles, study_sets,
-- flashcards, folders, folder_study_sets, saved_sets, study_progress,
-- test_results, match_results, content_reports
select table_name from information_schema.tables where table_schema = 'public'
order by table_name;

-- Phải có đúng 2 trigger này
select tgname from pg_trigger
where tgname in ('on_auth_user_created', 'flashcards_sync_card_count');

-- Phải có cột GENERATED
select column_name, is_generated from information_schema.columns
where table_name = 'study_sets' and column_name = 'search_vector';
```

> **Không chạy `pnpm db:seed` trên production.** Seed tạo 2 tài khoản demo với mật khẩu
> `Password123!` — đó là lỗ hổng trên môi trường công khai.

### Bước 2 — Deploy API lên Render

1. https://dashboard.render.com → **New** → **Web Service** → Connect repo `CloneVocab`.
2. Cấu hình:

| Trường | Giá trị |
|---|---|
| Name | `vocab-quiz-api` |
| **Region** | **Singapore** ← quan trọng, phải cùng vùng Supabase |
| Branch | `main` |
| Root Directory | *(để trống — build từ gốc monorepo)* |
| Runtime | Node |
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm build:api` |
| Start Command | `pnpm start:api` |
| Instance Type | **Free** |
| Health Check Path | `/api/v1/health` |

3. Environment variables (copy giá trị từ `.env.production.local`):

| Key | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `PORT` | `10000` — Render inject sẵn `PORT`, chỉ set nếu cần cố định |
| `DATABASE_URL` | Session pooler: `postgresql://postgres.xzaxbkflmqnsaltjyigu:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?connection_limit=5` |
| `DIRECT_URL` | **giống `DATABASE_URL`** (xem Chú ý 5) |
| `SUPABASE_URL` | `https://xzaxbkflmqnsaltjyigu.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key từ Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key — **bí mật, chỉ đặt ở đây** |
| `SUPABASE_JWT_SECRET` | **để trống hoàn toàn** (project cloud dùng JWKS) |
| `WEB_ORIGIN` | tạm `http://localhost:3000`, cập nhật ở Bước 4 |

4. Create Web Service. Chờ build (~4–7 phút lần đầu).
5. Kiểm chứng:
```bash
curl https://vocab-quiz-api.onrender.com/api/v1/health
# Kỳ vọng: {"status":"ok","database":"up","uptimeSeconds":<n>}
```
`"database":"up"` là bằng chứng Prisma nối được Supabase qua pooler IPv4.

> Nếu `"database":"down"`: kiểm tra `DATABASE_URL` có đúng host `pooler.supabase.com`
> (không phải `db.xzaxbkflmqnsaltjyigu.supabase.co`) và password đã URL-encode ký tự đặc biệt.

### Bước 3 — Deploy Web lên Netlify

`netlify.toml` đã cấu hình sẵn, không cần sửa.

1. https://app.netlify.com → **Add new site** → **Import an existing project** → repo `CloneVocab`.
2. Netlify tự đọc `netlify.toml`:
   - Build command: `pnpm turbo run build --filter=@flashcard/web...`
   - Publish directory: `apps/web/.next`
   - Plugin `@netlify/plugin-nextjs` tự kích hoạt
3. Environment variables (Site configuration → Environment variables):

| Key | Giá trị |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xzaxbkflmqnsaltjyigu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_API_URL` | `https://vocab-quiz-api.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://<ten-site>.netlify.app` |

> **Chỉ đặt biến `NEXT_PUBLIC_*` ở Netlify.** Mọi biến `NEXT_PUBLIC_*` đều được nhúng
> vào bundle gửi xuống trình duyệt. Service role key tuyệt đối không xuất hiện ở đây.

4. Deploy site. Lấy URL thật (ví dụ `https://vocab-quiz.netlify.app`).

### Bước 4 — Nối CORS hai chiều

Đây là bước hay bị quên và gây lỗi "đăng nhập được nhưng không load được dữ liệu".

1. **Render** → Environment → sửa `WEB_ORIGIN` = `https://vocab-quiz.netlify.app`
   (nhiều origin thì phân tách bằng dấu phẩy, không có space) → **Save** (tự redeploy).
2. **Supabase Dashboard** → Authentication → URL Configuration:
   - Site URL: `https://vocab-quiz.netlify.app`
   - Redirect URLs: thêm `https://vocab-quiz.netlify.app/**`
3. **Netlify** → sửa `NEXT_PUBLIC_SITE_URL` cho khớp → Trigger redeploy.

### Bước 5 — Keep-alive (bước quyết định "luôn online")

Không có bước này, phương án A **thất bại**: Render ngủ sau 15 phút và Supabase pause sau 7 ngày.

1. Đăng ký https://cron-job.org (free, không cần thẻ).
2. Create cronjob:

| Trường | Giá trị |
|---|---|
| URL | `https://vocab-quiz-api.onrender.com/api/v1/health` |
| Schedule | **Mỗi 10 phút**, nhưng **giới hạn 06:00–23:59** (giờ Việt Nam) |
| Timeout | 60s (đủ cho lần cold start đầu ngày) |
| Notification | Bật email khi thất bại |

**Tại sao giới hạn giờ, không ping 24/7:**

| Cách ping | Giờ tiêu thụ/tháng (31 ngày) | Margin trên 750h |
|---|---|---|
| 24/7 | 744h | 6h — **quá mỏng**, redeploy vài lần là vượt |
| 06:00–24:00 (18h/ngày) | 558h | 192h — an toàn |
| 07:00–23:00 (16h/ngày) | 496h | 254h — rất an toàn |

Ping 18h/ngày vẫn đạt mục tiêu: mọi lúc bạn thực sự dùng website thì nó đã thức. Chỉ khi
mở lúc 3h sáng mới phải chờ ~60s cho lần đầu.

> Nếu muốn thực sự 24/7 không giới hạn giờ, đó là lúc chuyển sang **Phương án B (Cloud Run)** —
> không có hạn mức giờ.

### Bước 6 — Smoke test (bắt buộc, ~10 phút)

| # | Việc kiểm | Kỳ vọng | Chứng minh điều gì |
|---|---|---|---|
| 1 | `curl .../api/v1/health` | `{"status":"ok","database":"up"}` | API + Prisma + pooler OK |
| 2 | Mở web, **Đăng ký** email mới | Vào được `/dashboard` | GoTrue OK + trigger `handle_new_user` đã tạo profile |
| 3 | Kiểm tra `/u/<username>` | Hiện hồ sơ công khai | FK cross-schema `profiles.id → auth.users.id` OK |
| 4 | Tạo bộ thẻ, thêm 5 thẻ | Chi tiết set hiện `5 thẻ` | CRUD OK + trigger `sync_study_set_card_count` OK |
| 5 | Upload 1 ảnh vào thẻ | Ảnh hiển thị | Bucket `flashcard-images` tự tạo + signed upload URL OK |
| 6 | Đặt set = PUBLIC, mở `/explore`, tìm theo tên | Tìm thấy | Cột `search_vector` GENERATED + GIN index OK |
| 7 | Học 1 lượt "Thẻ ghi nhớ", quay lại dashboard | Thống kê tăng | `StudyProgress` + `/study/stats` OK |
| 8 | Làm 1 bài "Kiểm tra" | Có điểm | `TestResult` + JSONB OK |
| 9 | Mở web **trên điện thoại**, đăng nhập | Vào được | Đạt yêu cầu gốc: dùng từ máy khác |
| 10 | Mở DevTools → Console | Không có lỗi CORS | `WEB_ORIGIN` đúng |

Nếu #5 thất bại: xem Render logs, tìm dòng
`Đã tạo thành công bucket flashcard-images (public)` hoặc `Không thể tự tạo bucket: ...`.

### Bước 7 — Google OAuth (tùy chọn)

Chỉ làm nếu bạn muốn nút "Đăng nhập bằng Google". Email/password đã chạy độc lập.

1. Google Cloud Console → Credentials → OAuth client ID (Web application)
   → Authorized redirect URI: `https://xzaxbkflmqnsaltjyigu.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → **Providers → Google** → bật, dán Client ID + Secret.
   (Trên cloud **không** dùng biến `GOOGLE_*` trong `.env` — cách đó chỉ dành cho local.)
3. Kiểm chứng: URL Configuration → Redirect URLs đã có domain Netlify, nếu không Supabase
   sẽ từ chối điều hướng ngược về web.

---

## 9. Phương án B — Cloud Run (khi cần nâng cấp)

Chuyển sang khi: (a) hết 750h Render, (b) có người dùng thật, (c) muốn thật sự 24/7.

Điều kiện tiên quyết: **đã sửa 3 lỗi Dockerfile ở Mục 7**.

```bash
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# Build từ thư mục gốc monorepo, chỉ định Dockerfile của api
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/<PROJECT_ID>/app/vocab-api \
  --region asia-southeast1

gcloud run deploy vocab-api \
  --image asia-southeast1-docker.pkg.dev/<PROJECT_ID>/app/vocab-api \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 4000 \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --concurrency 40 \
  --set-env-vars "NODE_ENV=production,SUPABASE_URL=...,WEB_ORIGIN=..." \
  --set-secrets "DATABASE_URL=db-url:latest,DIRECT_URL=db-url:latest,SUPABASE_SERVICE_ROLE_KEY=sr-key:latest,SUPABASE_ANON_KEY=anon-key:latest"
```

Lưu ý riêng của Cloud Run:
- **`--max-instances 2`** là chốt an toàn chi phí. Không giới hạn thì một đợt crawl có
  thể đẩy bạn vượt free tier.
- Prisma trên nhiều instance → mỗi instance mở connection riêng. Supabase Free pooler
  giới hạn connection → giữ `connection_limit=5` trong URL và `max-instances` thấp.
- Vẫn cần cron ping Supabase (không phải để chống cold start, mà để chống pause 7 ngày).
  Có thể dùng Cloud Scheduler (3 job free/tháng).

---

## 10. Risks

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|
| Vượt 750h Render → API suspend hết tháng | Trung bình | **Cao** — web chết hoàn toàn | Ping 16–18h/ngày, không 24/7. Theo dõi Render → Usage giữa tháng |
| Supabase pause vì cron chết mà không biết | Trung bình | Cao | Bật email notification trên cron-job.org. Kiểm tra dashboard mỗi 2 tuần |
| Cold start 60s ở request đầu ngày, SSR gọi API bị treo | Cao (mỗi ngày 1 lần) | Trung bình | Commit `d3f6eea` đã xử lý lỗi kết nối trên dashboard. Ping bắt đầu 06:00 để "hâm nóng" trước giờ dùng |
| Netlify SSR chạy ở us-east-1 → mỗi trang SSR có 1 round trip US↔SG (~220ms) | Chắc chắn | Thấp–TB | Chấp nhận. Nếu khó chịu: chuyển web sang Vercel Hobby và đặt function region `sin1` |
| Vượt 500MB DB / 1GB Storage | Thấp (dùng cá nhân) | Trung bình | Ảnh đã nén client-side (`compress-image.ts`) + giới hạn 5MB/file |
| Free tier của nền tảng đổi chính sách | Trung bình (12 tháng) | Trung bình | Kiến trúc container-hóa → di chuyển được. Cloud Run là đường lùi |
| Vercel Hobby cấm dùng thương mại | — | — | Nếu sau này thu phí, Netlify Free không có ràng buộc này → **giữ Netlify** |

---

## 11. Assumptions

1. Project Supabase `xzaxbkflmqnsaltjyigu` (ap-southeast-1) vẫn tồn tại và chưa bị pause
   quá 1 năm. **Cần bạn xác nhận ở Bước 0.**
2. Migration chưa từng chạy trên project cloud này. Nếu đã chạy, `prisma migrate deploy`
   sẽ tự bỏ qua — an toàn để chạy lại.
3. Repo GitHub `CloneVocab` là public hoặc bạn cho phép Render/Netlify truy cập.
4. Không cần domain riêng ở giai đoạn này.
5. Số liệu free tier đúng tại thời điểm 04/09/2026 (đã tra nguồn chính thức). Các nền
   tảng này thay đổi chính sách khá thường xuyên — kiểm tra lại nếu deploy sau vài tháng.

**Độ tin cậy tổng thể: Cao** cho phần đọc hiểu dự án (đọc trực tiếp toàn bộ source) và
phần 3 lỗi Dockerfile (đối chiếu lockfile + .npmrc). **Trung bình** cho Chú ý 4
(`pnpm prune`) — cần thực nghiệm mới kết luận chắc.

---

## 12. Next Actions

**Ngay bây giờ (thứ tự này quan trọng):**

1. ☐ Vào Supabase Dashboard, xác nhận project không bị pause → resume nếu cần *(2 phút)*
2. ☐ Chạy `pnpm db:deploy:prod` + 3 câu SQL kiểm chứng ở Bước 1 *(5 phút)*
3. ☐ Deploy API lên Render, region **Singapore**, dùng `build:api`/`start:api`
   (không cần Docker, không cần sửa 3 lỗi ở Mục 7) *(15 phút)*
4. ☐ `curl /api/v1/health` → phải thấy `"database":"up"` *(1 phút)*
5. ☐ Deploy web lên Netlify + set 4 biến `NEXT_PUBLIC_*` *(10 phút)*
6. ☐ Nối CORS hai chiều (Bước 4) — **đừng bỏ qua** *(5 phút)*
7. ☐ Tạo cron ping 10 phút/lần, 06:00–24:00 *(5 phút)*
8. ☐ Chạy hết 10 mục smoke test *(10 phút)*

**Tuần này:**
9. ☐ Sửa 3 lỗi Dockerfile ở Mục 7 + thêm `.dockerignore` — không cần cho Render nhưng là
   đường lùi sang Cloud Run
10. ☐ Cập nhật mục "Trạng thái" trong README (đã lạc hậu: folders và upload ảnh đã xong)

**Khi có người dùng thật:**
11. ☐ Chuyển API sang Cloud Run `asia-southeast1` (Mục 9)
12. ☐ Cân nhắc Supabase Pro ($25/tháng) — điểm đáng trả tiền đầu tiên, vì nó xóa bỏ
    rủi ro pause và nâng DB lên 8GB

---

## Sources

- [Deploy for Free – Render Docs](https://render.com/docs/free)
- [Render Regions](https://render.com/docs/regions)
- [Docker on Render](https://render.com/docs/docker)
- [Koyeb Pricing FAQ](https://www.koyeb.com/docs/faqs/pricing)
- [Cloud Run pricing – Google Cloud](https://cloud.google.com/run/pricing)
- [Project Pausing | Supabase Docs](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Billing on Supabase | Supabase Docs](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Change Project Region | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z)
- [Discontinued Plans · Fly Docs](https://fly.io/docs/about/discontinued-plans/)
- [Pricing on Northflank](https://northflank.com/docs/v1/application/billing/pricing-on-northflank)
- [Introducing Netlify's Free plan](https://www.netlify.com/blog/introducing-netlify-free-plan/)
