-- =====================================================================
-- Passport AI — Database schema
-- ตาราง: profiles, trips, messages, expenses, photos, passports
-- ทุกตารางเปิด Row Level Security: ผู้ใช้เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง
-- ยกเว้น passports ที่ตั้ง is_public = true จะเปิดให้คนมีลิงก์ดูได้
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- trips ----------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  destination text,
  start_date date not null,
  end_date date not null,
  companion text not null default 'friends',
  budget numeric(14, 2),
  home_currency text not null default 'THB',
  tone text not null default 'cute',
  theme text not null default 'ember',
  status text not null default 'active' check (status in ('active', 'ended')),
  cover_photo_path text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists trips_user_idx on public.trips (user_id, start_date desc);

-- ---------- photos (ไฟล์จริงอยู่ใน Storage bucket "trip-photos/<user_id>/<trip_id>/...") ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null,
  thumb_path text,
  original_name text,
  kind text not null default 'photo' check (kind in ('photo', 'receipt')),
  taken_at timestamp,            -- เวลาท้องถิ่นจาก EXIF (ไม่มี timezone)
  lat double precision,
  lon double precision,
  width int,
  height int,
  is_highlight boolean not null default false,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists photos_trip_idx on public.photos (trip_id, taken_at);

-- ---------- messages (แชทบันทึกทริป) ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  photo_id uuid references public.photos (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_trip_idx on public.messages (trip_id, created_at);

-- ---------- expenses ----------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  description text not null,
  category text not null default 'other'
    check (category in ('food', 'transport', 'accommodation', 'shopping', 'activity', 'other')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'THB',
  rate numeric(18, 8) not null default 1,
  amount_home numeric(14, 2) not null,
  spent_on date not null default current_date,
  source text not null default 'chat' check (source in ('chat', 'manual', 'receipt')),
  created_at timestamptz not null default now()
);
create index if not exists expenses_trip_idx on public.expenses (trip_id, spent_on);

-- ---------- passports ----------
create table if not exists public.passports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  share_slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  is_public boolean not null default false,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles  enable row level security;
alter table public.trips     enable row level security;
alter table public.photos    enable row level security;
alter table public.messages  enable row level security;
alter table public.expenses  enable row level security;
alter table public.passports enable row level security;

create policy "own profile read"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = id);

do $$
declare t text;
begin
  foreach t in array array['trips', 'photos', 'messages', 'expenses', 'passports'] loop
    execute format('create policy "own %1$s select" on public.%1$s for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own %1$s insert" on public.%1$s for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own %1$s update" on public.%1$s for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own %1$s delete" on public.%1$s for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ลิงก์แชร์ Passport: ใครก็ได้ที่มี share_slug อ่านได้ ถ้าเจ้าของเปิด is_public
create policy "public passports readable" on public.passports for select to anon, authenticated using (is_public);

-- กันการใส่ trip_id ของคนอื่น (เช็คว่า trip เป็นของผู้ใช้จริง)
create or replace function public.assert_trip_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.trips where id = new.trip_id and user_id = new.user_id) then
    raise exception 'trip not found or not owned by user';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['photos', 'messages', 'expenses', 'passports'] loop
    execute format('drop trigger if exists %1$s_trip_owner on public.%1$s', t);
    execute format('create trigger %1$s_trip_owner before insert or update of trip_id on public.%1$s for each row execute function public.assert_trip_owner()', t);
  end loop;
end $$;

-- =====================================================================
-- Storage: bucket "trip-photos"
-- โครงสร้างโฟลเดอร์: <user_id>/<trip_id>/<photo_id>.jpg และ thumbs/<photo_id>.jpg
-- bucket เป็น public-read (ไฟล์ตั้งชื่อด้วย UUID เดาไม่ได้) เพื่อให้ลิงก์แชร์ Passport แสดงรูปได้
-- แต่การอัปโหลด/ลบ ทำได้เฉพาะในโฟลเดอร์ของตัวเองเท่านั้น
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "trip-photos own read" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trip-photos own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trip-photos own update" on storage.objects for update to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trip-photos own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
