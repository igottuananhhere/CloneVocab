-- ===========================================================================
-- Cac rang buoc va logic phia database ma Prisma khong dien dat duoc trong
-- schema.prisma. File nay la NGUON GOC; noi dung cua no duoc sao chep nguyen van
-- vao thu muc migration tuong ung. Sua o day thi phai tao migration moi.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles.id phai tro toi auth.users.id
--    Prisma khong mo hinh hoa duoc khoa ngoai xuyen schema nen phai khai bao tay.
--    ON DELETE CASCADE: xoa tai khoan Supabase se don sach moi du lieu lien quan.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_auth_users_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Tu dong tao profile khi co tai khoan moi
--    Dang ky bang email hay Google deu di qua auth.users, nen trigger o day dam bao
--    khong bao gio ton tai user khong co profile - bat ke luong dang ky nao.
--    Username duoc suy tu phan truoc dau @ cua email, them hau to so neu bi trung.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate     text;
  suffix        integer := 0;
BEGIN
  base_username := regexp_replace(
    lower(split_part(coalesce(NEW.email, 'user'), '@', 1)),
    '[^a-z0-9_-]', '', 'g'
  );

  IF length(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;

  base_username := left(base_username, 24);
  candidate := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    candidate,
    nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'full_name',
                         NEW.raw_user_meta_data ->> 'name', '')), ''),
    nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'avatar_url',
                         NEW.raw_user_meta_data ->> 'picture', '')), ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Cot full-text search
--    Prisma tao search_vector nhu mot cot tsvector thuong. Thay bang cot GENERATED
--    de Postgres tu cap nhat, khong the quen dong bo o tang ung dung.
--    Dung cau hinh 'simple': Postgres khong co stemmer tieng Viet, 'simple' chi
--    chuan hoa chu thuong va tach tu - dung cho ca tieng Viet lan tieng Anh.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."study_sets" DROP COLUMN IF EXISTS "search_vector";

ALTER TABLE "public"."study_sets"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("subject", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("description", '')), 'C')
  ) STORED;

CREATE INDEX "study_sets_search_vector_idx"
  ON "public"."study_sets" USING GIN ("search_vector");

-- ---------------------------------------------------------------------------
-- 4. Giu study_sets.card_count dong bo
--    card_count la du lieu phi chuan hoa phuc vu trang Explore. Cap nhat o tang
--    ung dung se sai moi khi co duong ghi khac (seed, sua tay, xoa cascade), nen
--    dat trach nhiem nay o database.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_study_set_card_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.study_sets
      SET card_count = card_count + 1
      WHERE id = NEW.study_set_id;

  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.study_sets
      SET card_count = greatest(card_count - 1, 0)
      WHERE id = OLD.study_set_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.study_set_id IS DISTINCT FROM OLD.study_set_id) THEN
    UPDATE public.study_sets
      SET card_count = greatest(card_count - 1, 0)
      WHERE id = OLD.study_set_id;
    UPDATE public.study_sets
      SET card_count = card_count + 1
      WHERE id = NEW.study_set_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS flashcards_sync_card_count ON public.flashcards;
CREATE TRIGGER flashcards_sync_card_count
  AFTER INSERT OR UPDATE OR DELETE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.sync_study_set_card_count();

-- ---------------------------------------------------------------------------
-- 5. Khoa chat truy cap truc tiep tu client
--    Kien truc nay cho MOI truy cap du lieu di qua NestJS. Anon key khong duoc
--    phep doc hay ghi bat cu bang nao. Bat RLS ma khong khai bao policy nao =
--    tu choi tat ca. Chu so huu bang (role postgres, ket noi cua Prisma) khong bi
--    anh huong vi day khong phai FORCE ROW LEVEL SECURITY.
--
--    Neu sau nay co nhu cau cho client doc truc tiep, them policy cu the tai day -
--    dung tat RLS di.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'profiles', 'study_sets', 'flashcards', 'folders', 'folder_study_sets',
    'saved_sets', 'study_progress', 'test_results', 'match_results', 'content_reports'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
  END LOOP;
END;
$$;

-- Thu hoi quyen mac dinh Supabase cap cho anon/authenticated tren schema public.
-- Bo qua neu cac role nay khong ton tai (vi du chay tren Postgres thuan).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
  END IF;
END;
$$;
