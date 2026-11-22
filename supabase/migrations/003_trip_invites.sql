-- =====================================================================
-- Passport AI — 003: ชวนเพื่อนด้วยอีเมล ("คำเชิญรอในแอป" ยังไม่ส่งอีเมลจริง)
-- คำเชิญผูกกับอีเมล เมื่อเจ้าของอีเมลล็อกอิน/สมัคร จะเห็นคำเชิญที่หน้า "ทริปของฉัน" แล้วกดเข้าร่วมหรือปฏิเสธเอง
-- เพิ่ม/ตอบรับ/ปฏิเสธ ทำผ่าน RPC เท่านั้น และไม่บอกว่าอีเมลนั้นมีบัญชีในระบบหรือไม่
-- =====================================================================

create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, email)
);
create index if not exists trip_invites_email_idx on public.trip_invites (email);
alter table public.trip_invites enable row level security;

-- สมาชิกทริปเห็น/ยกเลิกคำเชิญที่ค้างของทริปนั้นได้ (การเพิ่ม/ตอบรับ/ปฏิเสธ ต้องผ่าน RPC)
create policy "invites visible to trip members" on public.trip_invites for select to authenticated
  using (public.is_trip_member(trip_id));
create policy "members cancel invites" on public.trip_invites for delete to authenticated
  using (public.is_trip_member(trip_id));

create or replace function public.my_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users where id = (select auth.uid())
$$;

create or replace function public.invite_by_email(p_trip uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email));
begin
  if not public.is_trip_member(p_trip) then raise exception 'not a member of this trip'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if (select count(*) from public.trip_invites where trip_id = p_trip) >= 30 then raise exception 'too many pending invites'; end if;
  insert into public.trip_invites (trip_id, email, invited_by) values (p_trip, v_email, (select auth.uid()))
  on conflict (trip_id, email) do nothing;
end;
$$;

create or replace function public.my_invites()
returns table (id uuid, trip_id uuid, trip_name text, destination text, start_date date, end_date date,
               invited_by_name text, member_count int, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, t.id, t.name, t.destination, t.start_date, t.end_date,
         coalesce((select m.display_name from public.trip_members m where m.trip_id = t.id and m.user_id = i.invited_by), 'เพื่อน'),
         (select count(*)::int from public.trip_members m where m.trip_id = t.id),
         i.created_at
  from public.trip_invites i join public.trips t on t.id = i.trip_id
  where i.email = public.my_email()
    and not exists (select 1 from public.trip_members m where m.trip_id = i.trip_id and m.user_id = (select auth.uid()))
  order by i.created_at desc
$$;

create or replace function public.accept_invite(p_invite uuid, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_trip uuid; v_name text := left(trim(coalesce(p_name, '')), 30);
begin
  select trip_id into v_trip from public.trip_invites where id = p_invite and email = public.my_email();
  if v_trip is null then raise exception 'invite not found'; end if;
  if v_name = '' then raise exception 'name required'; end if;
  if exists (select 1 from public.trip_members
             where trip_id = v_trip and user_id <> (select auth.uid())
               and lower(regexp_replace(display_name, '\s', '', 'g')) = lower(regexp_replace(v_name, '\s', '', 'g'))) then
    raise exception 'name taken';
  end if;
  insert into public.trip_members (trip_id, user_id, role, display_name)
  values (v_trip, (select auth.uid()), 'member', v_name)
  on conflict (trip_id, user_id) do nothing;
  delete from public.trip_invites where id = p_invite;
  return v_trip;
end;
$$;

create or replace function public.decline_invite(p_invite uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.trip_invites where id = p_invite and email = public.my_email()
$$;

revoke execute on function public.my_email(), public.invite_by_email(uuid, text), public.my_invites(),
  public.accept_invite(uuid, text), public.decline_invite(uuid) from public, anon;
grant execute on function public.my_email(), public.invite_by_email(uuid, text), public.my_invites(),
  public.accept_invite(uuid, text), public.decline_invite(uuid) to authenticated;
