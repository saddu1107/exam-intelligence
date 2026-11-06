-- Initial Exam Intelligence data model.
-- Apply in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  youtube_unlisted_url text,
  notes_file_path text,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  title text not null,
  question_count int not null check (question_count in (30,50)),
  seconds_per_question int not null default 20 check (seconds_per_question > 0),
  marks_correct numeric(6,2) not null default 2,
  marks_wrong numeric(6,2) not null default 0.5,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_option int not null check (correct_option between 0 and 3),
  explanation text,
  difficulty text check (difficulty in ('easy','moderate','difficult')),
  created_at timestamptz not null default now()
);

create table public.test_questions (
  test_id uuid not null references public.tests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  sort_order int not null,
  primary key (test_id, question_id),
  unique (test_id, sort_order)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id),
  student_id uuid not null references public.profiles(id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(8,2),
  correct_count int not null default 0,
  wrong_count int not null default 0,
  unanswered_count int not null default 0,
  time_taken_seconds int,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  created_at timestamptz not null default now()
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option int check (selected_option between 0 and 3),
  is_correct boolean,
  time_spent_seconds int,
  unique (attempt_id, question_id)
);

-- Enable RLS before exposing tables through the Supabase API.
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.lectures enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.test_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.responses enable row level security;

-- Policies are intentionally not opened broadly in this starter.
-- Next implementation step: add least-privilege policies for published content,
-- own attempts/responses, and admin-only content management.
