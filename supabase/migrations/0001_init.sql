-- =====================================================
-- StoreOps MVP Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Extensions
create extension if not exists "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  business_type text,
  created_at timestamptz default now()
);

create table if not exists store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('manager','crew')),
  created_at timestamptz default now(),
  unique(store_id, user_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  phase text not null check (phase in ('opening','regular','closing')),
  estimated_minutes int default 15,
  items jsonb not null default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  performed_by uuid references profiles(id),
  item_id text not null,
  item_title text,
  status text not null check (status in ('ok','anomaly')),
  note text,
  photo_url text,
  performed_at timestamptz default now()
);

create index if not exists idx_task_logs_lookup on task_logs(task_id, performed_at);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  task_id uuid references tasks(id),
  task_name text not null,
  report_date date not null,
  performer_id uuid references profiles(id),
  performer_name text,
  ok_count int default 0,
  anomaly_count int default 0,
  total_count int default 0,
  duration_min int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_reports_store_date on reports(store_id, report_date desc);

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  category text not null,
  severity text not null default 'normal',
  title text not null,
  description text,
  photo_url text,
  reporter_id uuid references profiles(id),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz default now()
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  code text unique not null,
  role text not null check (role in ('manager','crew')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- =====================================================
-- HELPERS
-- =====================================================

create or replace function my_store_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from store_members where user_id = auth.uid();
$$;

-- Signup: create org + store + membership + default template atomically
create or replace function create_store_for_user(
  p_user_name text,
  p_org_name text,
  p_store_name text,
  p_business_type text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_store_id uuid;
begin
  insert into profiles(id, name, email)
  values (auth.uid(), p_user_name, (select email from auth.users where id = auth.uid()))
  on conflict (id) do update set name = excluded.name;

  insert into organizations(name) values (p_org_name) returning id into v_org_id;

  insert into stores(organization_id, name, business_type)
  values (v_org_id, p_store_name, p_business_type)
  returning id into v_store_id;

  insert into store_members(store_id, user_id, role)
  values (v_store_id, auth.uid(), 'manager');

  insert into tasks(store_id, name, phase, estimated_minutes, items) values
  (v_store_id, '오픈 점검', 'opening', 15,
   '[
     {"id":"it_01","title":"매장 바닥 청소","description":"먼지 및 이물질 제거","require_photo":true},
     {"id":"it_02","title":"테이블 닦기","require_photo":true},
     {"id":"it_03","title":"쓰레기통 비우기","require_photo":true},
     {"id":"it_04","title":"커피머신 점검","description":"누수/청결/원두 상태 확인","require_photo":true},
     {"id":"it_05","title":"원두 잔량 확인","require_photo":true},
     {"id":"it_06","title":"화장실 청결 확인","require_photo":true}
   ]'::jsonb),
  (v_store_id, '마감 점검', 'closing', 10,
   '[
     {"id":"it_11","title":"장비 전원 확인","require_photo":true},
     {"id":"it_12","title":"문단속","require_photo":true},
     {"id":"it_13","title":"CCTV 점검","require_photo":true},
     {"id":"it_14","title":"최종 청소","require_photo":true}
   ]'::jsonb);

  return v_store_id;
end;
$$;

grant execute on function create_store_for_user to authenticated;

-- Crew: join store by invitation code
create or replace function join_store_by_code(p_user_name text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  select * into v_invite
  from invitations
  where code = p_code and used_at is null and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invitation code';
  end if;

  insert into profiles(id, name, email)
  values (auth.uid(), p_user_name, (select email from auth.users where id = auth.uid()))
  on conflict (id) do update set name = excluded.name;

  insert into store_members(store_id, user_id, role)
  values (v_invite.store_id, auth.uid(), v_invite.role)
  on conflict (store_id, user_id) do nothing;

  update invitations set used_at = now() where id = v_invite.id;

  return v_invite.store_id;
end;
$$;

grant execute on function join_store_by_code to authenticated;

-- Returns current user's membership (role + store)
create or replace function my_membership()
returns table (store_id uuid, store_name text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, sm.role
  from store_members sm
  join stores s on s.id = sm.store_id
  where sm.user_id = auth.uid()
  order by sm.created_at asc
  limit 1;
$$;

grant execute on function my_membership to authenticated;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table stores enable row level security;
alter table store_members enable row level security;
alter table tasks enable row level security;
alter table task_logs enable row level security;
alter table reports enable row level security;
alter table issues enable row level security;
alter table invitations enable row level security;

-- profiles
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select
  using (id = auth.uid() or id in (
    select user_id from store_members where store_id in (select my_store_ids())
  ));
drop policy if exists "upsert own profile" on profiles;
create policy "upsert own profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- organizations (read only; created via RPC)
drop policy if exists "read own orgs" on organizations;
create policy "read own orgs" on organizations for select
  using (id in (select organization_id from stores where id in (select my_store_ids())));

-- stores
drop policy if exists "read member stores" on stores;
create policy "read member stores" on stores for select
  using (id in (select my_store_ids()));

-- store_members
drop policy if exists "read memberships" on store_members;
create policy "read memberships" on store_members for select
  using (user_id = auth.uid() or store_id in (select my_store_ids()));

-- tasks
drop policy if exists "read member tasks" on tasks;
create policy "read member tasks" on tasks for select
  using (store_id in (select my_store_ids()));
drop policy if exists "managers write tasks" on tasks;
create policy "managers write tasks" on tasks for all
  using (store_id in (select store_id from store_members where user_id = auth.uid() and role = 'manager'))
  with check (store_id in (select store_id from store_members where user_id = auth.uid() and role = 'manager'));

-- task_logs
drop policy if exists "members rw logs" on task_logs;
create policy "members rw logs" on task_logs for all
  using (store_id in (select my_store_ids()))
  with check (store_id in (select my_store_ids()));

-- reports
drop policy if exists "members rw reports" on reports;
create policy "members rw reports" on reports for all
  using (store_id in (select my_store_ids()))
  with check (store_id in (select my_store_ids()));

-- issues
drop policy if exists "members rw issues" on issues;
create policy "members rw issues" on issues for all
  using (store_id in (select my_store_ids()))
  with check (store_id in (select my_store_ids()));

-- invitations
drop policy if exists "public read invitations" on invitations;
create policy "public read invitations" on invitations for select using (true);
drop policy if exists "managers create invitations" on invitations;
create policy "managers create invitations" on invitations for insert
  with check (store_id in (select store_id from store_members where user_id = auth.uid() and role = 'manager'));
drop policy if exists "managers update invitations" on invitations;
create policy "managers update invitations" on invitations for update
  using (store_id in (select store_id from store_members where user_id = auth.uid() and role = 'manager'));

-- =====================================================
-- STORAGE BUCKET (run in SQL Editor after creating bucket in UI)
-- =====================================================
-- 1. Create bucket named 'photos' in Storage UI, set Public
-- 2. Then run:
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
--   on conflict do nothing;
-- create policy "authenticated upload photos" on storage.objects for insert
--   to authenticated with check (bucket_id = 'photos');
-- create policy "public read photos" on storage.objects for select
--   to public using (bucket_id = 'photos');
