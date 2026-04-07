-- =====================================================
-- StoreOps MVP Schema (Supabase / PostgreSQL)
-- Supabase Dashboard → SQL Editor 에서 이 파일 전체를 실행
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. users (auth.users와 1:1 프로필)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('crew','manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- auth.users에 row 생길 때 자동으로 public.users 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'crew')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. organizations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  owner_id   UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. stores
-- =====================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  business_type   TEXT,
  address         TEXT,
  opening_time    TIME NOT NULL DEFAULT '09:00',
  closing_time    TIME NOT NULL DEFAULT '22:00',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_org ON public.stores(organization_id);

-- =====================================================
-- 4. store_members (매장-유저 멤버십)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.store_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id  UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('manager','crew')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_user ON public.store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_store ON public.store_members(store_id);

-- =====================================================
-- 5. invitations (초대 코드)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code       TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'crew' CHECK (role IN ('manager','crew')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at    TIMESTAMPTZ,
  used_by    UUID REFERENCES public.users(id),
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 6. tasks (체크리스트 템플릿)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phase      TEXT NOT NULL CHECK (phase IN ('opening','regular','closing')),
  items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_store ON public.tasks(store_id) WHERE is_active;

-- =====================================================
-- 7. daily_tasks (특정 날짜 점검 인스턴스)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  task_id        UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  snapshot       JSONB NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed','missed')),
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, task_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_lookup
  ON public.daily_tasks(store_id, scheduled_date);

-- =====================================================
-- 8. task_logs (항목별 수행 기록)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.task_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_task_id    UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  template_item_id TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('ok','anomaly','skipped')),
  note             TEXT,
  photo_url        TEXT,
  performed_by     UUID REFERENCES public.users(id),
  performed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(daily_task_id, template_item_id)
);

CREATE INDEX IF NOT EXISTS idx_logs_daily_task ON public.task_logs(daily_task_id);

-- =====================================================
-- 9. issues
-- =====================================================
CREATE TABLE IF NOT EXISTS public.issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto_from_anomaly')),
  category     TEXT NOT NULL CHECK (category IN ('equipment','leak','cleanliness','stock','safety','etc')),
  severity     TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('low','normal','high','urgent')),
  title        TEXT NOT NULL,
  description  TEXT,
  photo_url    TEXT,
  task_log_id  UUID REFERENCES public.task_logs(id),
  reporter_id  UUID REFERENCES public.users(id),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_issues_store_status
  ON public.issues(store_id, status) WHERE status IN ('open','in_progress');

-- =====================================================
-- 10. reports (일일 자동 요약)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  report_date  DATE NOT NULL,
  summary      JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_reports_store_date
  ON public.reports(store_id, report_date DESC);

-- =====================================================
-- Trigger: anomaly task_log → 자동 issue 생성
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_create_issue_from_anomaly()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_item_title TEXT;
BEGIN
  IF NEW.status = 'anomaly' THEN
    SELECT dt.store_id INTO v_store_id
      FROM public.daily_tasks dt WHERE dt.id = NEW.daily_task_id;

    SELECT item->>'title' INTO v_item_title
      FROM public.daily_tasks dt,
           jsonb_array_elements(dt.snapshot->'items') item
      WHERE dt.id = NEW.daily_task_id
        AND item->>'id' = NEW.template_item_id
      LIMIT 1;

    INSERT INTO public.issues
      (store_id, source, category, title, description, photo_url, task_log_id, reporter_id)
    VALUES
      (v_store_id, 'auto_from_anomaly', 'etc',
       COALESCE(v_item_title, '이상 감지'),
       NEW.note, NEW.photo_url, NEW.id, NEW.performed_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_anomaly_to_issue ON public.task_logs;
CREATE TRIGGER trg_anomaly_to_issue
  AFTER INSERT ON public.task_logs
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_issue_from_anomaly();

-- =====================================================
-- Helper: 현재 유저가 속한 매장 id 목록
-- =====================================================
CREATE OR REPLACE FUNCTION public.my_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT store_id FROM public.store_members WHERE user_id = auth.uid();
$$;

-- =====================================================
-- Helper: 현재 유저의 role
-- =====================================================
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- =====================================================
-- RPC: 새 매장 셋업 (회원가입 후 자동 호출)
-- =====================================================
CREATE OR REPLACE FUNCTION public.setup_new_store(
  p_org_name TEXT,
  p_store_name TEXT,
  p_business_type TEXT DEFAULT '무인카페'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_store_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;

  INSERT INTO public.organizations (name, owner_id)
    VALUES (p_org_name, auth.uid())
    RETURNING id INTO v_org_id;

  INSERT INTO public.stores (organization_id, name, business_type)
    VALUES (v_org_id, p_store_name, p_business_type)
    RETURNING id INTO v_store_id;

  INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (v_store_id, auth.uid(), 'manager');

  -- 기본 템플릿 시드
  INSERT INTO public.tasks (store_id, name, phase, items) VALUES
  (v_store_id, '오픈 점검', 'opening',
    '[
      {"id":"it_01","title":"매장 바닥 청소","description":"먼지 및 이물질 제거","require_photo":true},
      {"id":"it_02","title":"테이블 닦기","require_photo":true},
      {"id":"it_03","title":"쓰레기통 비우기","require_photo":true},
      {"id":"it_04","title":"커피머신 점검","description":"누수/청결/원두 상태","require_photo":true},
      {"id":"it_05","title":"원두 잔량 확인","require_photo":true},
      {"id":"it_06","title":"컵/뚜껑/빨대 재고","require_photo":true},
      {"id":"it_07","title":"화장실 청결","require_photo":true},
      {"id":"it_08","title":"냉장고 온도","require_photo":true}
    ]'::jsonb),
  (v_store_id, '마감 점검', 'closing',
    '[
      {"id":"cl_01","title":"장비 전원 확인","require_photo":true},
      {"id":"cl_02","title":"문단속","require_photo":true},
      {"id":"cl_03","title":"CCTV 점검","require_photo":true},
      {"id":"cl_04","title":"쓰레기 배출","require_photo":true},
      {"id":"cl_05","title":"조명 점검","require_photo":true},
      {"id":"cl_06","title":"최종 청소","require_photo":true}
    ]'::jsonb);

  RETURN v_store_id;
END;
$$;

-- =====================================================
-- RPC: 초대 코드로 매장 가입
-- =====================================================
CREATE OR REPLACE FUNCTION public.accept_invite(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;

  SELECT * INTO v_invite FROM public.invitations
    WHERE code = upper(p_code) AND used_at IS NULL AND expires_at > now()
    LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않거나 만료된 초대 코드입니다';
  END IF;

  INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (v_invite.store_id, auth.uid(), v_invite.role)
    ON CONFLICT (store_id, user_id) DO NOTHING;

  UPDATE public.invitations
    SET used_at = now(), used_by = auth.uid()
    WHERE id = v_invite.id;

  RETURN v_invite.store_id;
END;
$$;

-- =====================================================
-- RPC: 오늘의 daily_tasks 확보 (없으면 생성)
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_today_daily_tasks(p_store_id UUID)
RETURNS SETOF public.daily_tasks
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_task RECORD;
BEGIN
  IF p_store_id NOT IN (SELECT public.my_store_ids()) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  FOR v_task IN
    SELECT * FROM public.tasks
    WHERE store_id = p_store_id AND is_active
  LOOP
    INSERT INTO public.daily_tasks (store_id, task_id, scheduled_date, snapshot)
    VALUES (
      p_store_id, v_task.id, v_today,
      jsonb_build_object(
        'name', v_task.name,
        'phase', v_task.phase,
        'items', v_task.items
      )
    )
    ON CONFLICT (store_id, task_id, scheduled_date) DO NOTHING;
  END LOOP;

  RETURN QUERY
    SELECT * FROM public.daily_tasks
    WHERE store_id = p_store_id AND scheduled_date = v_today
    ORDER BY created_at;
END;
$$;

-- =====================================================
-- RPC: 리포트 생성 (daily_task 완료 시 호출)
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_report_for_today(p_store_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_summary JSONB;
BEGIN
  IF p_store_id NOT IN (SELECT public.my_store_ids()) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  SELECT jsonb_build_object(
    'total_tasks', COUNT(DISTINCT dt.id),
    'completed',   COUNT(DISTINCT dt.id) FILTER (WHERE dt.status = 'completed'),
    'total_items', COALESCE(SUM(jsonb_array_length(dt.snapshot->'items')), 0),
    'ok_items',    COUNT(tl.id) FILTER (WHERE tl.status = 'ok'),
    'anomaly_items', COUNT(tl.id) FILTER (WHERE tl.status = 'anomaly')
  ) INTO v_summary
  FROM public.daily_tasks dt
  LEFT JOIN public.task_logs tl ON tl.daily_task_id = dt.id
  WHERE dt.store_id = p_store_id AND dt.scheduled_date = v_today;

  INSERT INTO public.reports (store_id, report_date, summary)
  VALUES (p_store_id, v_today, v_summary)
  ON CONFLICT (store_id, report_date) DO UPDATE SET
    summary = EXCLUDED.summary, generated_at = now();
END;
$$;

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports       ENABLE ROW LEVEL SECURITY;

-- users: 자기 자신 + 같은 매장 멤버 읽기 가능
DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users FOR SELECT
  USING (id = auth.uid() OR id IN (
    SELECT user_id FROM public.store_members
    WHERE store_id IN (SELECT public.my_store_ids())
  ));

DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update" ON public.users FOR UPDATE
  USING (id = auth.uid());

-- stores: 멤버만 읽기
DROP POLICY IF EXISTS "stores_member_read" ON public.stores;
CREATE POLICY "stores_member_read" ON public.stores FOR SELECT
  USING (id IN (SELECT public.my_store_ids()));

-- store_members: 자기 매장 모든 멤버 읽기
DROP POLICY IF EXISTS "members_read" ON public.store_members;
CREATE POLICY "members_read" ON public.store_members FOR SELECT
  USING (store_id IN (SELECT public.my_store_ids()));

-- invitations: manager만 생성/조회
DROP POLICY IF EXISTS "invitations_manager_all" ON public.invitations;
CREATE POLICY "invitations_manager_all" ON public.invitations FOR ALL
  USING (
    store_id IN (SELECT public.my_store_ids())
    AND public.my_role() = 'manager'
  )
  WITH CHECK (
    store_id IN (SELECT public.my_store_ids())
    AND public.my_role() = 'manager'
  );

-- tasks (템플릿): 멤버 읽기, manager 쓰기
DROP POLICY IF EXISTS "tasks_read" ON public.tasks;
CREATE POLICY "tasks_read" ON public.tasks FOR SELECT
  USING (store_id IN (SELECT public.my_store_ids()));
DROP POLICY IF EXISTS "tasks_manager_write" ON public.tasks;
CREATE POLICY "tasks_manager_write" ON public.tasks FOR ALL
  USING (
    store_id IN (SELECT public.my_store_ids())
    AND public.my_role() = 'manager'
  )
  WITH CHECK (
    store_id IN (SELECT public.my_store_ids())
    AND public.my_role() = 'manager'
  );

-- daily_tasks: 멤버 읽기/쓰기
DROP POLICY IF EXISTS "daily_tasks_member_all" ON public.daily_tasks;
CREATE POLICY "daily_tasks_member_all" ON public.daily_tasks FOR ALL
  USING (store_id IN (SELECT public.my_store_ids()))
  WITH CHECK (store_id IN (SELECT public.my_store_ids()));

-- task_logs: 멤버 읽기/쓰기
DROP POLICY IF EXISTS "task_logs_member_all" ON public.task_logs;
CREATE POLICY "task_logs_member_all" ON public.task_logs FOR ALL
  USING (
    daily_task_id IN (
      SELECT id FROM public.daily_tasks
      WHERE store_id IN (SELECT public.my_store_ids())
    )
  )
  WITH CHECK (
    daily_task_id IN (
      SELECT id FROM public.daily_tasks
      WHERE store_id IN (SELECT public.my_store_ids())
    )
  );

-- issues: 멤버 읽기/쓰기
DROP POLICY IF EXISTS "issues_member_all" ON public.issues;
CREATE POLICY "issues_member_all" ON public.issues FOR ALL
  USING (store_id IN (SELECT public.my_store_ids()))
  WITH CHECK (store_id IN (SELECT public.my_store_ids()));

-- reports: 멤버 읽기
DROP POLICY IF EXISTS "reports_member_read" ON public.reports;
CREATE POLICY "reports_member_read" ON public.reports FOR SELECT
  USING (store_id IN (SELECT public.my_store_ids()));

-- organizations: 오너만 읽기
DROP POLICY IF EXISTS "org_owner_read" ON public.organizations;
CREATE POLICY "org_owner_read" ON public.organizations FOR SELECT
  USING (owner_id = auth.uid());

-- =====================================================
-- Storage bucket: task-photos
-- Dashboard Storage에서 버킷을 만들거나 아래 실행
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "photos_authenticated_upload" ON storage.objects;
CREATE POLICY "photos_authenticated_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-photos');

DROP POLICY IF EXISTS "photos_public_read" ON storage.objects;
CREATE POLICY "photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-photos');
