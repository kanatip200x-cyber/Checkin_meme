-- =====================================================================
-- Checkin_meme — Supabase schema (Postgres)
-- ใช้สร้างฐานข้อมูลใหม่: เปิด Supabase Dashboard → SQL Editor → วางไฟล์นี้ → Run
-- จากนั้นเพิ่มอีเมลแอดมิน:  insert into public.admins (email) values ('you@gmail.com');
-- =====================================================================

-- ===== Tables =====
create table public.students (
  id text primary key,
  name text not null,
  room text,
  user_id uuid unique references auth.users(id) on delete set null,  -- บัญชี Google ที่ผูกกับชื่อนี้
  email text,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id bigint generated always as identity primary key,
  student_id text not null references public.students(id) on delete cascade,
  check_date date not null,                       -- วันที่ตามเวลาไทย
  checked_at timestamptz not null default now(),
  status text not null check (status in ('ตรงเวลา','สาย')),
  signature text,                                 -- PNG data URL
  user_id uuid references auth.users(id) on delete set null,
  unique (student_id, check_date)                 -- 1 คน เช็คได้วันละครั้ง
);
create index attendance_check_date_idx on public.attendance (check_date);
create index attendance_user_id_idx on public.attendance (user_id);

create table public.settings (key text primary key, value text not null default '');
-- keys: class_name, start_time (HH:MM), late_minutes, form_meme

create table public.memes (
  id bigint generated always as identity primary key,
  rank_key text not null check (rank_key in ('top','good','risk','ghost','new')),
  url text not null default '',
  top_text text not null default '',
  bot_text text not null default ''
);

create table public.admins (email text primary key);

-- ===== Row Level Security =====
alter table public.students   enable row level security;
alter table public.attendance enable row level security;
alter table public.settings   enable row level security;
alter table public.memes      enable row level security;
alter table public.admins     enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins a
                 where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create policy students_read  on public.students for select to authenticated using (true);
create policy students_admin on public.students for all    to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy attendance_read  on public.attendance for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy attendance_admin on public.attendance for all    to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy settings_read  on public.settings for select to authenticated using (true);
create policy settings_admin on public.settings for all    to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy memes_read  on public.memes for select to authenticated using (true);
create policy memes_admin on public.memes for all    to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admins_read on public.admins for select to authenticated using ((select public.is_admin()));

create or replace function public.setting(p_key text, p_default text)
returns text language sql stable security definer set search_path = ''
as $$ select coalesce((select value from public.settings where key = p_key), p_default); $$;

-- ===== RPC: ผูกบัญชีกับชื่อในรายชื่อ (ครั้งแรกที่ล็อกอิน) =====
create or replace function public.claim_student(p_id text)
returns json language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_email text := auth.jwt() ->> 'email'; v_row public.students;
begin
  if v_uid is null then raise exception 'กรุณาเข้าสู่ระบบก่อน'; end if;
  if exists (select 1 from public.students where user_id = v_uid) then raise exception 'บัญชีนี้ผูกกับรายชื่อไว้แล้ว'; end if;
  select * into v_row from public.students where id = p_id for update;
  if not found then raise exception 'ไม่พบรหัสนี้ในรายชื่อ'; end if;
  if v_row.user_id is not null then raise exception 'ชื่อนี้มีบัญชีอื่นผูกไว้แล้ว ถ้าไม่ใช่คุณ แจ้งครูให้ยกเลิกการผูก'; end if;
  update public.students set user_id = v_uid, email = v_email, claimed_at = now() where id = p_id;
  return json_build_object('id', v_row.id, 'name', v_row.name);
end; $$;

-- ===== RPC: เช็คชื่อ (เฉพาะชื่อตัวเอง เวลาฝั่งเซิร์ฟเวอร์ Asia/Bangkok) =====
create or replace function public.check_in(p_signature text)
returns json language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid(); v_st public.students; v_now timestamptz := now();
  v_local timestamp := (now() at time zone 'Asia/Bangkok');
  v_start text := public.setting('start_time', '08:30');
  v_late int := coalesce(nullif(public.setting('late_minutes', '15'), '')::int, 15);
  v_limit int; v_status text; v_existing public.attendance;
begin
  if v_uid is null then raise exception 'กรุณาเข้าสู่ระบบก่อน'; end if;
  select * into v_st from public.students where user_id = v_uid;
  if not found then raise exception 'บัญชีนี้ยังไม่ได้ผูกกับรายชื่อ'; end if;
  if p_signature is null or left(p_signature, 11) <> 'data:image/' then raise exception 'กรุณาเซ็นชื่อก่อนยืนยัน'; end if;
  if length(p_signature) > 60000 then raise exception 'ลายเซ็นมีขนาดใหญ่เกินไป กรุณาเซ็นใหม่'; end if;
  select * into v_existing from public.attendance where student_id = v_st.id and check_date = v_local::date;
  if found then raise exception '% เช็คชื่อไปแล้วเมื่อ % น.', v_st.name, to_char(v_existing.checked_at at time zone 'Asia/Bangkok', 'HH24:MI'); end if;
  v_limit := split_part(v_start, ':', 1)::int * 60 + split_part(v_start, ':', 2)::int + v_late;
  v_status := case when extract(hour from v_local)::int * 60 + extract(minute from v_local)::int <= v_limit then 'ตรงเวลา' else 'สาย' end;
  insert into public.attendance (student_id, check_date, checked_at, status, signature, user_id)
  values (v_st.id, v_local::date, v_now, v_status, p_signature, v_uid);
  return json_build_object('name', v_st.name, 'time', to_char(v_local, 'HH24:MI:SS'), 'status', v_status);
end; $$;

-- ===== RPC: ข้อมูลทั้งหมดที่หน้าเว็บใช้ (ลายเซ็นเห็นเฉพาะของตัวเอง/แอดมิน, อีเมลเห็นเฉพาะแอดมิน) =====
create or replace function public.get_dashboard()
returns json language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid(); v_admin boolean := public.is_admin();
  v_today date := (now() at time zone 'Asia/Bangkok')::date; v_me public.students;
begin
  if v_uid is null then raise exception 'กรุณาเข้าสู่ระบบก่อน'; end if;
  select * into v_me from public.students where user_id = v_uid;
  return json_build_object(
    'today', to_char(v_today, 'YYYY-MM-DD'),
    'me', json_build_object('email', auth.jwt() ->> 'email', 'is_admin', v_admin, 'student_id', v_me.id, 'name', v_me.name),
    'settings', json_build_object(
      'className', public.setting('class_name', 'ชั้นเรียน'), 'startTime', public.setting('start_time', '08:30'),
      'lateMinutes', coalesce(nullif(public.setting('late_minutes', '15'), '')::int, 15), 'formMeme', public.setting('form_meme', '')),
    'students', coalesce((select json_agg(json_build_object('id', s.id, 'name', s.name, 'room', s.room,
        'claimed', s.user_id is not null, 'email', case when v_admin then s.email end) order by s.id) from public.students s), '[]'::json),
    'records', coalesce((select json_agg(json_build_object('id', a.id, 'date', to_char(a.check_date, 'YYYY-MM-DD'),
        'time', to_char(a.checked_at at time zone 'Asia/Bangkok', 'HH24:MI:SS'), 'student_id', a.student_id, 'status', a.status,
        'sig', case when a.check_date = v_today and (v_admin or a.user_id = v_uid) then a.signature else '' end)
        order by a.check_date, a.checked_at) from public.attendance a), '[]'::json),
    'memes', coalesce((select json_agg(json_build_object('key', m.rank_key, 'url', m.url, 'top', m.top_text, 'bot', m.bot_text) order by m.id)
        from public.memes m where m.url <> ''), '[]'::json));
end; $$;

-- ===== RPC: แอดมิน =====
create or replace function public.admin_unlink(p_id text)
returns void language plpgsql security definer set search_path = ''
as $$ begin
  if not public.is_admin() then raise exception 'เฉพาะแอดมินเท่านั้น'; end if;
  update public.students set user_id = null, email = null, claimed_at = null where id = p_id;
end; $$;

create or replace function public.admin_signature(p_attendance_id bigint)
returns text language plpgsql stable security definer set search_path = ''
as $$ begin
  if not public.is_admin() then raise exception 'เฉพาะแอดมินเท่านั้น'; end if;
  return (select signature from public.attendance where id = p_attendance_id);
end; $$;

revoke execute on function public.is_admin(), public.setting(text, text), public.claim_student(text), public.check_in(text),
  public.get_dashboard(), public.admin_unlink(text), public.admin_signature(bigint) from public, anon;
grant execute on function public.is_admin(), public.setting(text, text), public.claim_student(text), public.check_in(text),
  public.get_dashboard(), public.admin_unlink(text), public.admin_signature(bigint) to authenticated;

-- ===== ค่าเริ่มต้น =====
insert into public.settings (key, value) values
  ('class_name', 'ชั้นเรียน'), ('start_time', '08:30'), ('late_minutes', '15'), ('form_meme', '')
on conflict (key) do nothing;
