# Thebai — Giai doan 2: Quan ly bo the, kham pha, khung trang

Ngay: 2026-08-23
Trang thai: Thiet ke da duyet, khung UI da trien khai truoc (xem muc 7), backend chua code

## 1. Boi canh

Giai doan 1 da dung nen mong: monorepo, schema Prisma day du cho ca MVP, xac thuc,
ho so ca nhan/cong khai. Giai doan 2 bien schema da co (`StudySet`, `Flashcard`,
`Folder`, `FolderStudySet`, `SavedSet`, `ContentReport`) thanh tinh nang dung duoc:
tao/sua bo the, upload anh, gom nhom bang folder, kham pha + tim kiem, luu bo the
nguoi khac, bao cao noi dung vi pham. Xem
[thiet ke Giai doan 1](2026-08-23-flashcard-p1-nen-mong-design.md) de biet cac
ranh gioi kien truc da chot (Supabase chi la ha tang, moi du lieu qua NestJS, RLS la
luoi an toan cuoi).

Trong luc brainstorm, nguoi dung yeu cau kiem tra giao dien truoc va gui anh chup mot
giao dien flashcard app khac de tham khao bo cuc. Phan sidebar/khung trang (muc 7) vi
vay da duoc dung thanh code thuc te ngay trong buoi brainstorm, truoc khi viet xong
spec nay — thu tu nguoc voi quy trinh thong thuong nhung duoc ghi lai day du o day.

## 2. Cac quyet dinh kien truc

### 2.1 Flashcard: thay CRUD tung the bang "thay toan bo mang"

Trang sua bo the cho phep keo-tha sap xep, dan nhanh, sua tung the, xoa the — tat ca
xay ra tren MOT mang o client truoc khi bam Luu. Vi vay API khong co endpoint rieng
cho tung hanh dong; chi mot:

```
PUT /study-sets/:id/flashcards
Body: [{ id?, term, definition, imagePath? }, ...]   // thu tu mang = position
```

NestJS chay trong mot Prisma transaction: the co `id` -> update; khong co `id` ->
tao moi; the cu khong con trong mang -> xoa (cascade don `study_progress` lien quan
qua FK). `position` gan lai bang chinh index trong mang.

Danh doi: khong co API "xoa 1 the" doc lap — nhung frontend khong can no (moi thao
tac sua deu di qua man hinh editor toan bo bo the), va giam han so endpoint phai
viet/test.

### 2.2 Upload anh: NestJS cap signed URL, trinh duyet tu upload thang

1. Client resize anh ve toi da 1200px canh dai, doi WebP bang canvas ngay tren
   trinh duyet.
2. `POST /uploads/flashcard-image` (can dang nhap, KHONG can bo the da ton tai —
   luc dang tao moi, bo the chua co id). NestJS validate `contentType` theo whitelist
   (`image/webp`, `image/jpeg`, `image/png`), dung service-role key tao signed
   upload URL voi path `${userId}/${uuid}.webp`. UUID va path do SERVER sinh, khong
   nhan tu client — tranh path traversal.
3. Client PUT file thang len Storage bang URL do — khong qua NestJS.
4. Client luu `imagePath` tra ve vao state cua the; khi bam Luu, path nay nam trong
   mang gui len `PUT /study-sets/:id/flashcards`.

Bucket **public-read**, duong dan la UUID ngau nhien khong doan duoc. Chap nhan
duoc voi anh minh hoa flashcard (khong phai du lieu nhay cam) — mot bo the private
van an toan vi trang chua no khong hien cho ai khac, chi ban than URL anh (neu bi lo
ra ngoai) moi xem duoc. Gioi han 5MB thuc thi o cap bucket Storage
(`file_size_limit`), resize o client chi la toi uu, khong phai co che chan.

### 2.3 Quy tac hien thi/quyen — mot ham dung lai o moi noi

| Tinh huong | Ket qua |
| --- | --- |
| GET bo the `PRIVATE` boi nguoi khong phai owner | 404 — khong tiet lo su ton tai |
| GET bo the `UNLISTED`/`PUBLIC` | 200, ai xem cung duoc |
| PATCH/DELETE/PUT flashcards boi khong phai owner, bo the `PUBLIC`/`UNLISTED` | 403 — bo the ai cung thay nen khong can giau, chi chan hanh dong |
| PATCH/DELETE/PUT flashcards boi khong phai owner, bo the `PRIVATE` | 404 — giong rule GET |

Logic nam trong mot ham `assertOwnership` duy nhat, dung lai cho moi endpoint sua/xoa
— tranh moi endpoint tu viet lai quy tac va lech nhau.

### 2.4 Folder co the chua bat ky bo the nao nhin thay duoc

Khong gioi han folder chi chua bo the tu tao — cho phep gom ca bo the
public/unlisted cua nguoi khac (tuong tu co che "luu"). Day la lua chon don gian
nhat phu hop voi cach folder hoat dong trong da so app tuong tu; khong dua vao dien
hoi rieng vi la chi tiet muc thap.

### 2.5 View count: tang don gian, khong chong trung

`study_sets.view_count` tang 1 moi khi nguoi KHONG phai owner load trang chi tiet bo
the, khong chong trung lap theo session. Du dung cho muc dich sap xep "Pho bien" o
Explore; chinh xac tuyet doi khong can thiet o quy mo nay.

### 2.6 Khung trang: sidebar toan site (quyet dinh cua nguoi dung)

Toi de xuat sidebar chi ap dung cho khu vuc da dang nhap (giu top-nav don gian cho
trang cong khai, toi uu SEO/SSR). Nguoi dung chon **ap dung toan bo website, moi
trang** — bao gom landing, explore, ho so cong khai. Da xac nhan quyet dinh nay
khong pha SEO/SSR: sidebar la Server Component, noi dung chinh cua tung trang van
render server nhu cu, sidebar chi la them mot lop chrome dieu huong.

Chi tiet trien khai xem muc 7.

## 3. API surface

| Nhom | Endpoint | Ghi chu |
| --- | --- | --- |
| Study sets | `POST/GET/PATCH/DELETE /study-sets`, `/study-sets/:id` | Quy tac hien thi theo muc 2.3 |
| Flashcards | `PUT /study-sets/:id/flashcards` | Thay toan bo mang, theo muc 2.1 |
| Anh | `POST /uploads/flashcard-image` | Tra ve signed upload URL, theo muc 2.2 |
| Explore | `GET /study-sets?visibility=PUBLIC&q=&subject=&sort=&page=` | `q` dung `search_vector` da co tu P1 |
| Folders | `POST/GET/PATCH/DELETE /folders`, `PUT /folders/:id/study-sets` | Add/remove set la mot PUT thay toan bo danh sach id, cung mo hinh voi flashcards |
| Luu bo the | `POST/DELETE /study-sets/:id/save` | Toggle dong trong `saved_sets` |
| Bao cao | `POST /study-sets/:id/reports` | Khong can dang nhap (reporterId nullable) |

`GET /study-sets` (Explore) la `@Public()` nhung van thu giai ma token neu co —
theo dung mau da dung o `/profiles/:username` tu P1.

## 4. Xu ly loi va validate

- **Luu bo the**: `PUT /study-sets/:id/flashcards` bat buoc mang co >= 1 the hop le
  (term/definition khong rong). Neu the gui len co `id` thuoc bo the khac -> 400,
  chan truoc khi vao transaction.
- **Upload anh**: sai `contentType` -> 400. Path/UUID do server sinh.
- **Bao cao**: khong gioi han tan suat gui o P2 — chap nhan rui ro spam thap vi bao
  cao chi ghi log, admin tu xem qua Prisma Studio. Diem con thieu, ghi ro de lam sau
  neu can.
- Tai su dung toan bo ha tang loi tu P1: `ApiError` dinh dang thong nhat,
  `ZodValidationPipe` cho 400 kem `details`, `AllExceptionsFilter` doi ma Prisma
  (P2002 -> 409 cho ten folder trung) sang HTTP status dung nghia.

## 5. Data model

Khong doi schema. Toan bo bang can cho P2 (`StudySet`, `Flashcard`, `Folder`,
`FolderStudySet`, `SavedSet`, `ContentReport`) da co tu migration cua P1.

## 6. Kiem thu

- **Unit test service** (kieu P1): quy tac 403/404 theo muc 2.3, logic thay-toan-
  bo-mang the (upsert theo id, xoa the bi bo, gan lai `position`, chan id la cua bo
  the khac), whitelist content-type anh, logic tang `view_count` (bo qua khi
  viewer la owner).
- **Unit test Zod schema** trong `@flashcard/contracts`: rang buoc tao/sua bo the,
  schema query Explore (page/pageSize/sort/subject/q, gia tri mac dinh).
- **Unit test ham thuan phia web**: parser dan nhanh (tach text theo tab/dong thanh
  mang `{term, definition}`) — test ky vi de sai (dong rong, thieu tab, khoang
  trang thua).
- **Khong unit-test duoc**: resize/nen anh bang Canvas API (can DOM canvas thuc,
  jsdom khong ho tro day du) — xac minh bang tay khi review, gioi han da biet.
- **E2E (Playwright)**: tiep tuc de danh den sau Giai doan 3, dung nhu da quyet o P1.

## 7. Khung trang & dieu huong (da trien khai)

Phan nay da duoc dung thanh code trong luc brainstorm (nguoi dung yeu cau kiem tra
giao dien truoc khi tiep tuc thiet ke backend).

**Cau truc**: sidebar trai (`SidebarShell` + `SidebarContent`), topbar
(`ShellInteractive` + `TopbarSearch` + `TopbarActions`), diem vao duy nhat goi
Supabase la `AppShell` (Server Component) — moi component con nhan `isLoggedIn` qua
prop, khong tu goi lai Supabase.

| File | Vai tro |
| --- | --- |
| `components/layout/app-shell.tsx` | Server Component, goi `supabase.auth.getUser()` mot lan |
| `components/layout/shell-interactive.tsx` | Client, so huu state `mobileOpen`, ghep sidebar+topbar+main dung vi tri DOM |
| `components/layout/sidebar-shell.tsx` | Client, thuan hien thi drawer/backdrop tren mobile |
| `components/layout/sidebar-content.tsx` | Server Component, danh sach dieu huong + placeholder folder |
| `components/layout/nav-link.tsx` | Client nho, `usePathname()` de highlight muc dang chon |
| `components/layout/nav-data.ts` | Du lieu nav theo trang thai dang nhap |
| `components/layout/topbar-search.tsx` | Form GET thuan toi `/explore?q=`, khong can JS |
| `components/layout/topbar-actions.tsx` | Nut tao bo the, avatar, dang nhap/dang ky theo `isLoggedIn` |

**Sidebar theo trang thai dang nhap** (bo "Nhom hoc", "Tro choi", "Thong bao" so voi
anh tham khao — tinh nang lop hoc/xa hoi/live da bi loai khoi pham vi tu dau):

| Chua dang nhap | Da dang nhap |
| --- | --- |
| Trang chu (`/`) | Bang dieu khien (`/dashboard`) |
| Kham pha (`/explore`) | Kham pha (`/explore`) |
| — | *Thu muc cua ban* — placeholder, chua noi API thuc |
| Dang nhap / Dang ky | Cai dat, avatar/Dang xuat |

**Gioi han da biet, ghi ro de khong nham la quyet dinh cuoi**:
- 3 dong folder trong sidebar la du lieu minh hoa, khong bam duoc — se thay bang
  `GET /folders` that khi phan 3 (API Folders) duoc code.
- Khong co nut thu gon sidebar thanh icon-rail tren desktop — chi co drawer an/hien
  tren mobile. Don gian hoa co y, co the them sau neu can.
- Avatar la mot chu cai tinh, chua noi `Profile.avatarUrl`.

**Trang moi/da doi**:
- `/sets/create`, `/sets/[id]/edit` — placeholder da tao (`/sets/create`), se thanh
  form thuc: dan nhanh + tung dong term/definition + keo-tha sap xep (dnd-kit,
  theo quyet dinh nguoi dung) + upload anh.
- `/sets/[id]` — chi tiet: tieu de, mo ta, nut hanh dong owner, nut che do hoc (hien
  dien nhung chua co logic — noi o Giai doan 3).
- `/folders/[id]` — breadcrumb "Thu muc / Ten", luoi bo the trong folder.
- `/dashboard` — doi thanh 2 tab "Bo the cua toi" / "Da luu", giu khoi thong ke da
  co tu P1.
- `/explore` — noi that: o tim kiem, dropdown loc mon hoc, hai nut sap "Moi nhat"/
  "Pho bien", phan trang so (khong dung cuon vo han — theo quyet dinh nguoi dung,
  uu tien SEO).

**Bug da bat va sua trong luc dung**:
- `cva()` (class-variance-authority) bo qua key `className` khong xac dinh trong
  danh sach variant — phai boc bang `cn(buttonVariants({...}), 'class-them')` thay
  vi truyen `className` thang vao `buttonVariants({...})`.
- Truyen component icon (mot ham) tu Server Component sang Client Component qua
  props gay loi serialize ("Functions cannot be passed directly to Client
  Components"). Sua bang cach render icon thanh JSX o Server Component roi moi
  truyen ReactNode xuong Client Component.

## 8. Ha tang production (da thiet lap trong luc brainstorm)

Project Supabase Cloud (`xzaxbkflmqnsaltjyigu`) da duoc tao va nhan day migration
cua P1 — 11 bang, RLS bat khong policy tren moi bang, FK sang `auth.users`, trigger
tao profile, cot `search_vector` generated — da kiem chung khop 100% voi local.

Phat hien quan trong: **Direct connection cua Supabase free-tier chi chay qua
IPv6** (khong co dia chi IPv4 rieng tru khi mua add-on). Moi truong dev hien tai
khong co duong IPv6 ("Network is unreachable"). Giai phap: dung **Session pooler**
cho ca `DATABASE_URL` va `DIRECT_URL` — pooler nay ho tro prepared statements nen
`prisma migrate deploy` van chay dung.

Credential nam trong `.env.production.local` (khop rule `.gitignore` da co tu P1,
khong vao git). Them hai script `db:deploy:prod` / `db:studio:prod` — CO Y KHONG
tao `reset:prod`/`seed:prod` de khong ai vo tinh chay lenh pha du lieu len
production.

## 9. Pham vi

Da thiet ke, chua code (backend):
- CRUD `StudySet`, thay-toan-bo-mang `Flashcard`, upload anh qua signed URL
- CRUD `Folder` + gan bo the
- Explore: tim kiem + loc + sap xep + phan trang
- Luu bo the (`SavedSet`), bao cao noi dung (`ContentReport`)

Da trien khai (frontend, truoc khi code backend — xem muc 7):
- Khung sidebar toan site, topbar, cac trang placeholder khong con 404

Ngoai pham vi P2 (khong doi so voi P1):
- AI sinh the, che do Live, lop hoc, tinh nang xa hoi, import file — van de danh
  giai doan sau nhu P1 da ghi ro
