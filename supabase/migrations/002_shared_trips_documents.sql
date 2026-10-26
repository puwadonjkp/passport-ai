-- =====================================================================
-- Passport AI — 002: ทริปร่วมกับเพื่อน (สมาชิก + หารเงิน) และเอกสารเดินทาง (Boarding Pass / โรงแรม)
-- =====================================================================

-- ---------- สมาชิกทริป ----------
create table if not exists public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null default 'นักเดินทาง',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user_idx on public.trip_members (user_id);
alter table public.trip_members enable row level security;

-- รหัสเชิญ (ลิงก์ #/join/<code>) — ค่า default แบบ volatile จะสุ่มให้ทุกแถวเดิมด้วย
alter table public.trips add column if not exists invite_code text unique
  default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

create or replace function public.is_trip_member(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = (select auth.uid()))
$$;

create or replace function public.is_trip_member_text(t text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trip_members where trip_id::text = t and user_id = (select auth.uid()))
$$;

create or replace function public.is_trip_owner(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips where id = t and user_id = (select auth.uid()))
$$;

-- เจ้าของทริปเป็นสมาชิกอัตโนมัติ
create or replace function public.add_trip_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trip_members (trip_id, user_id, role, display_name)
  values (new.id, new.user_id, 'owner', coalesce((select display_name from public.profiles where id = new.user_id), 'นักเดินทาง'))
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists trips_add_owner on public.trips;
create trigger trips_add_owner after insert on public.trips for each row execute function public.add_trip_owner();

insert into public.trip_members (trip_id, user_id, role, display_name, joined_at)
select t.id, t.user_id, 'owner', coalesce(p.display_name, 'นักเดินทาง'), t.created_at
from public.trips t left join public.profiles p on p.id = t.user_id
on conflict do nothing;

-- ---------- ใครจ่าย / หารกับใคร ----------
alter table public.expenses add column if not exists paid_by uuid references auth.users (id) on delete set null;
update public.expenses set paid_by = user_id where paid_by is null;
alter table public.expenses alter column paid_by set default auth.uid();
alter table public.expenses add column if not exists split_with uuid[]; -- null = หารเท่ากันทุกคนในทริป

-- ---------- เอกสารเดินทาง ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'other' check (kind in ('flight', 'hotel', 'other')),
  storage_path text,
  original_name text,
  mime text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists documents_trip_idx on public.documents (trip_id, created_at);
alter table public.documents enable row level security;

-- ---------- RLS: เปลี่ยนจาก "เจ้าของเท่านั้น" เป็น "สมาชิกทริป" ----------
do $$
declare t text; a text;
begin
  foreach t in array array['trips', 'photos', 'messages', 'expenses', 'passports'] loop
    foreach a in array array['select', 'insert', 'update', 'delete'] loop
      execute format('drop policy if exists "own %1$s %2$s" on public.%1$s', t, a);
    end loop;
  end loop;
end $$;

create policy "trips member select" on public.trips for select to authenticated
  using (user_id = (select auth.uid()) or public.is_trip_member(id));
create policy "trips owner insert" on public.trips for insert to authenticated with check (user_id = (select auth.uid()));
create policy "trips owner update" on public.trips for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "trips owner delete" on public.trips for delete to authenticated using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['photos', 'messages', 'expenses', 'documents'] loop
    execute format('create policy "%1$s member select" on public.%1$s for select to authenticated using (public.is_trip_member(trip_id))', t);
    execute format('create policy "%1$s member insert" on public.%1$s for insert to authenticated with check (user_id = (select auth.uid()) and public.is_trip_member(trip_id))', t);
    execute format('create policy "%1$s member update" on public.%1$s for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id))', t);
    execute format('create policy "%1$s member delete" on public.%1$s for delete to authenticated using (user_id = (select auth.uid()) or public.is_trip_owner(trip_id) or (%2$s and public.is_trip_member(trip_id)))', t, case when t = 'expenses' then 'true' else 'false' end);
  end loop;
end $$;

create policy "passports member select" on public.passports for select to authenticated using (public.is_trip_member(trip_id));
create policy "passports member insert" on public.passports for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_trip_member(trip_id));
create policy "passports member update" on public.passports for update to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "passports owner delete" on public.passports for delete to authenticated using (public.is_trip_owner(trip_id));

create policy "members see members" on public.trip_members for select to authenticated using (public.is_trip_member(trip_id));
create policy "members rename self" on public.trip_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "leave or remove member" on public.trip_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid()) or public.is_trip_owner(trip_id)));

-- trigger เดิมเช็ค "เป็นเจ้าของทริป" -> เปลี่ยนเป็น "เป็นสมาชิกทริป"
create or replace function public.assert_trip_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.trip_members where trip_id = new.trip_id and user_id = new.user_id) then
    raise exception 'trip not found or user is not a member';
  end if;
  return new;
end;
$$;
drop trigger if exists documents_trip_owner on public.documents;
create trigger documents_trip_owner before insert or update of trip_id on public.documents
  for each row execute function public.assert_trip_owner();

-- ---------- RPC: ดูข้อมูลคำเชิญ / เข้าร่วมทริป ----------
create or replace function public.trip_invite_preview(code text)
returns table (trip_id uuid, name text, destination text, start_date date, end_date date, owner_name text, member_count int, already_member boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name, t.destination, t.start_date, t.end_date,
         (select display_name from public.trip_members where trip_id = t.id and role = 'owner'),
         (select count(*)::int from public.trip_members where trip_id = t.id),
         exists (select 1 from public.trip_members where trip_id = t.id and user_id = (select auth.uid()))
  from public.trips t where t.invite_code = code
$$;

create or replace function public.join_trip(code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_trip uuid;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  select id into v_trip from public.trips where invite_code = code;
  if v_trip is null then raise exception 'invalid invite code'; end if;
  insert into public.trip_members (trip_id, user_id, role, display_name)
  values (v_trip, (select auth.uid()), 'member',
          coalesce((select display_name from public.profiles where id = (select auth.uid())), 'นักเดินทาง'))
  on conflict do nothing;
  return v_trip;
end;
$$;

revoke execute on function public.trip_invite_preview(text), public.join_trip(text) from public, anon;
grant execute on function public.trip_invite_preview(text), public.join_trip(text) to authenticated;
revoke execute on function public.add_trip_owner() from public, anon, authenticated;

-- ---------- Storage: สมาชิกอัปโหลด/ดูไฟล์ในโฟลเดอร์ทริปได้ (<owner>/<trip_id>/...) + รองรับ PDF ----------
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] where id = 'trip-photos';

create policy "trip-photos member read" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and public.is_trip_member_text((storage.foldername(name))[2]));
create policy "trip-photos member insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and public.is_trip_member_text((storage.foldername(name))[2]));
create policy "trip-photos member delete" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and public.is_trip_member_text((storage.foldername(name))[2]));

-- ---------- Realtime: แชท/รายจ่าย/รูป อัปเดตสดให้ทุกคนในทริป ----------
alter publication supabase_realtime add table public.messages, public.expenses, public.photos, public.documents, public.trip_members;

revoke execute on function public.is_trip_member(uuid), public.is_trip_member_text(text), public.is_trip_owner(uuid) from public, anon;
grant execute on function public.is_trip_member(uuid), public.is_trip_member_text(text), public.is_trip_owner(uuid) to authenticated;
