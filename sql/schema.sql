-- swiManager schema. Idempotent: `npm run db:push` can be re-run safely.
--
-- The v1 tables (levels/criteria/progress/lesson_logs/...) modelled a different app
-- and are dropped here. Everything the three views need is re-seeded by `npm run db:seed`.
-- `if exists` / `if not exists` notices are just noise here.
set client_min_messages = warning;

drop table if exists progress cascade;
drop table if exists level_completions cascade;
drop table if exists class_enrollments cascade;
drop table if exists lesson_logs cascade;
drop table if exists class_slots cascade;
drop table if exists criteria cascade;
drop table if exists levels cascade;
drop table if exists venues cascade;

create extension if not exists "pgcrypto";

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  name          text not null,
  role          text not null default 'instructor',
  parent_name   text,
  created_at    timestamptz not null default now()
);
alter table users add column if not exists role text not null default 'instructor';
alter table users add column if not exists parent_name text;

-- One row per student. `progress` holds the whole stage tree (sequences -> criteria ->
-- sub-skills) as it is only ever read and written whole.
create table if not exists students (
  id          text primary key,
  name        text not null,
  level       text not null,
  parent_name text not null,
  venue       text not null,
  rate        integer not null,
  progress    jsonb not null,
  coach_id    uuid references users(id) on delete set null
);
alter table students add column if not exists coach_id uuid references users(id) on delete set null;

create table if not exists classes (
  id          text primary key,
  label       text not null,
  day_of_week integer not null,
  start_hour  double precision not null,
  end_hour    double precision not null,
  time_label  text not null,
  venue       text not null,
  capacity    integer not null,
  levels      text[] not null,
  student_ids text[] not null
);

create table if not exists attendance (
  student_id  text not null references students(id) on delete cascade,
  lesson_date text not null,
  status      text not null,
  primary key (student_id, lesson_date)
);

create table if not exists makeup_credits (
  id            text primary key,
  student_id    text not null references students(id) on delete cascade,
  issued_date   text not null,
  expires_date  text not null,
  status        text not null default 'available',
  used_date     text,
  used_hour     integer,
  used_class_id text
);

create table if not exists makeup_bookings (
  id          uuid primary key default gen_random_uuid(),
  credit_id   text not null references makeup_credits(id) on delete cascade,
  student_id  text not null references students(id) on delete cascade,
  class_id    text not null references classes(id) on delete cascade,
  booked_date text not null
);

-- The coach's own hourly make-up availability. student_id null = free, set = booked.
create table if not exists coach_slots (
  slot_date  text not null,
  slot_hour  integer not null,
  student_id text references students(id) on delete set null,
  credit_id  text references makeup_credits(id) on delete set null,
  primary key (slot_date, slot_hour)
);

create table if not exists blocked_dates (
  blocked_date text primary key
);

-- A row exists only once invoices for that period have been generated.
create table if not exists invoices (
  parent_name text not null,
  period      text not null,
  status      text not null default 'pending',
  primary key (parent_name, period)
);

create table if not exists stage_completions (
  id             uuid primary key default gen_random_uuid(),
  student_id     text not null references students(id) on delete cascade,
  stage          text not null,
  completed_date text not null,
  result         text not null,
  created_at     timestamptz not null default now()
);

-- Snapshot taken right before each promotion, so a mistaken one can be undone exactly.
create table if not exists progress_history (
  id         uuid primary key default gen_random_uuid(),
  student_id text not null references students(id) on delete cascade,
  level      text not null,
  progress   jsonb not null,
  created_at timestamptz not null default now()
);
