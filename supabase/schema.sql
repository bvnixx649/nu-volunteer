-- NU Volunteer schema (SPEC section 9). Paste into the Supabase SQL Editor and Run. Safe to run again.

-- Tables ---------------------------------------------------------------------------------------

create table if not exists students (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  reminders text[] not null default '{}',
  notify jsonb not null default '{}'
);

create table if not exists orgs (
  code text primary key,
  name text not null,
  admin boolean not null default false
);

create table if not exists activities (
  id text primary key,
  title text not null,
  category_key text not null,
  org text not null,
  org_code text not null,
  poster text not null default '',
  description text not null default '',
  place text not null default '',
  lat double precision,
  lng double precision,
  start_at timestamptz not null,
  end_at timestamptz not null,
  hours double precision not null,
  cap_limit boolean not null default false,
  capacity integer not null default 0,
  walk_in boolean not null default false,
  qr_mode text not null default 'dynamic' check (qr_mode in ('dynamic', 'static')),
  loc_mode text not null default 'on' check (loc_mode in ('on', 'off')),
  radius integer not null default 150,
  qr_interval integer not null default 10,
  supervisor_name text not null default '',
  supervisor_phone text not null default '',
  chat_enabled boolean not null default false,
  open_chat_url text,
  opens_at timestamptz,
  cancel_days integer,
  closed_at timestamptz,
  submitted_at timestamptz,
  recorded_at timestamptz,
  hidden boolean,
  hide_until_open boolean,
  created_at timestamptz not null default now(),
  reg_count integer not null default 0,
  credit_count integer not null default 0
);
-- Bottle exchange: how many bottles make one hour. Null for every other category.
alter table activities add column if not exists items_per_hour integer;

-- Templates a supervisor made, shared by everyone who signs in with the same org code (SPEC 6.3).
-- Activities made from one are category_key 'other' and remember template_id (no foreign key: deleting a template keeps them).
create table if not exists templates (
  id text primary key,
  org_code text not null,
  title text not null,
  poster text not null default '',
  description text not null default '',
  hours double precision not null,
  settings jsonb not null default '{}',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists templates_org_idx on templates (org_code);
alter table activities add column if not exists template_id text;

create table if not exists registrations (
  activity_id text not null references activities (id) on delete cascade,
  student_id text not null,
  name text not null,
  at timestamptz not null default now(),
  walk_in boolean not null default false,
  cancelled_at timestamptz,
  late boolean not null default false,
  waived boolean not null default false,
  primary key (activity_id, student_id)
);

-- The primary key is what stops a second credit for the same person and activity.
create table if not exists credits (
  activity_id text not null references activities (id) on delete cascade,
  student_id text not null,
  name text not null,
  hours double precision not null,
  full_hours double precision not null,
  at timestamptz not null default clock_timestamp(),
  method text not null check (method in ('qr', 'manual')),
  distance double precision,
  accuracy double precision,
  flags text[] not null default '{}',
  device_id text,
  ref text,
  edited_by text,
  edited_at timestamptz,
  reason text,
  primary key (activity_id, student_id)
);
-- Bottle exchange: how many bottles the hours were counted from.
alter table credits add column if not exists items integer;

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references activities (id) on delete cascade,
  text text not null default '',
  images text[] not null default '{}',
  at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references activities (id) on delete cascade,
  author_id text not null,
  author_name text not null,
  text text not null,
  at timestamptz not null default now(),
  sup boolean not null default false
);

create table if not exists dms (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references activities (id) on delete cascade,
  student_id text not null,
  from_sup boolean not null default false,
  author_name text not null,
  text text not null,
  at timestamptz not null default now(),
  read boolean not null default false
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  kind text not null,
  title text not null,
  body text not null default '',
  activity_id text,
  "to" text,
  at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists registrations_student_idx on registrations (student_id);
create index if not exists credits_student_idx on credits (student_id);
create index if not exists notices_student_idx on notices (student_id);
create index if not exists dms_activity_student_idx on dms (activity_id, student_id);
create index if not exists messages_activity_idx on messages (activity_id);
create index if not exists announcements_activity_idx on announcements (activity_id);

-- Functions (called with rpc) ------------------------------------------------------------------

-- Server clock in ms; the app subtracts its own clock once at startup.
create or replace function server_now() returns bigint
language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

-- The only way to read orgs: a code in, at most one row out.
create or replace function get_org(p_code text) returns table (code text, name text, admin boolean)
language sql stable security definer set search_path = public as $$
  select o.code, o.name, o.admin from orgs o where o.code = p_code
$$;

-- Writes the credit unless one exists, bumps credit_count, and registers walk-ins. Returns
-- {ok, credit}; ok is false with the existing credit when the student already has one.
-- Locking the activity row first lines up simultaneous claims one after another.
-- Adding p_scanned_at makes a new overload, so the old 11-argument version is dropped first (otherwise both would exist).
drop function if exists claim(text, text, text, double precision, text, text[], double precision, double precision, text, text, text);
-- p_scanned_at: when a phone kept the scan while offline and sends it later, this is the real scan time.
-- Null behaves exactly as before. A value counts only if it is not in the future (1 minute of slack), not older than
-- 48 hours, and within [start_at - 1 hour, end_at + 24 hours] of the activity; otherwise clock_timestamp() is used.
-- A counted value is stored in credits.at and the credit gets the flag 'offline'.
create or replace function claim(
  p_activity text, p_student text, p_name text, p_hours double precision, p_method text,
  p_flags text[], p_distance double precision, p_accuracy double precision,
  p_device text, p_ref text, p_by text, p_scanned_at timestamptz default null
) returns jsonb
language plpgsql as $$
declare
  act activities;
  c credits;
  reg registrations;
  v_flags text[] := coalesce(p_flags, '{}');
  v_now timestamptz := clock_timestamp();
  v_at timestamptz := v_now;
begin
  select * into act from activities where id = p_activity for update;

  if p_scanned_at is not null
     and p_scanned_at <= v_now + interval '1 minute'
     and p_scanned_at >= v_now - interval '48 hours'
     and (act.id is null or (p_scanned_at >= act.start_at - interval '1 hour' and p_scanned_at <= act.end_at + interval '24 hours'))
  then
    v_at := p_scanned_at;
    if not ('offline' = any (v_flags)) then v_flags := array_append(v_flags, 'offline'); end if;
  end if;

  select * into c from credits where activity_id = p_activity and student_id = p_student;
  if found then
    return jsonb_build_object('ok', false, 'credit', to_jsonb(c));
  end if;

  if p_device is not null and exists (
    select 1 from credits where activity_id = p_activity and device_id = p_device
  ) then
    update credits set flags = array_append(flags, 'device')
      where activity_id = p_activity and device_id = p_device and not ('device' = any (flags));
    if not ('device' = any (v_flags)) then v_flags := array_append(v_flags, 'device'); end if;
  end if;

  insert into credits (activity_id, student_id, name, hours, full_hours, at, method, distance, accuracy, flags, device_id, ref, edited_by)
  values (p_activity, p_student, p_name, p_hours, coalesce(act.hours, p_hours), v_at, p_method,
          p_distance, p_accuracy, v_flags, p_device, p_ref, p_by)
  on conflict (activity_id, student_id) do nothing
  returning * into c;
  if not found then
    select * into c from credits where activity_id = p_activity and student_id = p_student;
    return jsonb_build_object('ok', false, 'credit', to_jsonb(c));
  end if;

  update activities set credit_count = credit_count + 1 where id = p_activity;

  select * into reg from registrations where activity_id = p_activity and student_id = p_student;
  if not found or reg.cancelled_at is not null then
    insert into registrations (activity_id, student_id, name, at, walk_in)
    values (p_activity, p_student, p_name, c.at, true)
    on conflict (activity_id, student_id) do update
      set name = excluded.name, at = excluded.at, walk_in = true, cancelled_at = null, late = false, waived = false;
    update activities set reg_count = reg_count + 1 where id = p_activity;
  end if;

  return jsonb_build_object('ok', true, 'credit', to_jsonb(c));
end $$;

-- Registers a student; false when the activity is full (cap_limit) or the student is already registered.
create or replace function register(p_activity text, p_student text, p_name text) returns boolean
language plpgsql as $$
declare
  act activities;
  reg registrations;
begin
  select * into act from activities where id = p_activity for update;
  if not found then return false; end if;
  select * into reg from registrations where activity_id = p_activity and student_id = p_student;
  if found and reg.cancelled_at is null then return false; end if;
  if act.cap_limit and act.reg_count >= act.capacity then return false; end if;
  insert into registrations (activity_id, student_id, name)
  values (p_activity, p_student, p_name)
  on conflict (activity_id, student_id) do update
    set name = excluded.name, at = now(), cancelled_at = null, walk_in = false;
  update activities set reg_count = reg_count + 1 where id = p_activity;
  return true;
end $$;

-- Marks a registration cancelled and lowers reg_count.
create or replace function cancel_registration(p_activity text, p_student text) returns void
language plpgsql as $$
begin
  perform 1 from activities where id = p_activity for update;
  update registrations set cancelled_at = now()
    where activity_id = p_activity and student_id = p_student and cancelled_at is null;
  if found then
    update activities set reg_count = greatest(0, reg_count - 1) where id = p_activity;
  end if;
end $$;

-- Deletes the registration and its credit, if any; counters never go below 0.
-- A cancelled registration was already taken out of reg_count.
create or replace function remove_registration(p_activity text, p_student text) returns void
language plpgsql as $$
declare
  was_active boolean;
begin
  perform 1 from activities where id = p_activity for update;
  delete from registrations where activity_id = p_activity and student_id = p_student
    returning cancelled_at is null into was_active;
  if found and was_active then
    update activities set reg_count = greatest(0, reg_count - 1) where id = p_activity;
  end if;
  delete from credits where activity_id = p_activity and student_id = p_student;
  if found then
    update activities set credit_count = greatest(0, credit_count - 1) where id = p_activity;
  end if;
end $$;

create or replace function remove_credit(p_activity text, p_student text) returns void
language plpgsql as $$
begin
  perform 1 from activities where id = p_activity for update;
  delete from credits where activity_id = p_activity and student_id = p_student;
  if found then
    update activities set credit_count = greatest(0, credit_count - 1) where id = p_activity;
  end if;
end $$;

create or replace function set_hours(p_activity text, p_student text, p_hours double precision, p_reason text, p_by text)
returns void language sql as $$
  update credits set hours = p_hours, reason = p_reason, edited_by = p_by, edited_at = clock_timestamp()
  where activity_id = p_activity and student_id = p_student
$$;

create or replace function close_roster(p_activity text) returns void
language sql as $$
  update activities set closed_at = clock_timestamp() where id = p_activity and closed_at is null
$$;

-- Sets submitted_at once, and closed_at too if the roster was still open.
create or replace function submit_roster(p_activity text) returns void
language sql as $$
  update activities
  set submitted_at = clock_timestamp(), closed_at = coalesce(closed_at, clock_timestamp())
  where id = p_activity and submitted_at is null
$$;

-- Access (SPEC 9.7) ----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['students', 'activities', 'registrations', 'credits', 'announcements', 'messages', 'dms', 'notices', 'templates'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "signed in" on %I', t);
    execute format('create policy "signed in" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- orgs: RLS on and no policy, so nobody reads it directly; get_org (security definer) is the way in.
alter table orgs enable row level security;
revoke all on orgs from anon, authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- Realtime ---------------------------------------------------------------------------------------

-- Deletes carry the whole old row, so a listener can tell which activity it belongs to.
alter table registrations replica identity full;
alter table credits replica identity full;

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['activities', 'registrations', 'credits'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
