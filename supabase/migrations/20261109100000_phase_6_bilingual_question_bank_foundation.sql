-- Phase 6: additive bilingual question-bank foundation.
-- Existing questions, tests, attempts and responses are preserved.
create table if not exists public.question_bank_entries (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete restrict,
  syllabus_item_id uuid references public.exam_syllabus(id) on delete set null,
  legacy_question_id uuid unique references public.questions(id) on delete set null,
  source_type text not null default 'original' check (source_type in ('pyq','original')),
  exam_year integer check (exam_year is null or exam_year between 1990 and 2100),
  difficulty text check (difficulty is null or difficulty in ('easy','moderate','difficult')),
  status text not null default 'draft' check (status in ('draft','review','approved','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_bank_pyq_year_required check (source_type <> 'pyq' or exam_year is not null)
);
create table if not exists public.question_bank_translations (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.question_bank_entries(id) on delete cascade,
  language text not null check (language in ('en','hi')),
  question_text text not null,
  options jsonb not null,
  correct_option integer not null check (correct_option between 0 and 3),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_bank_translation_language_unique unique(entry_id, language),
  constraint question_bank_options_four check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4)
);
create table if not exists public.question_bank_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.question_bank_entry_tags (
  entry_id uuid not null references public.question_bank_entries(id) on delete cascade,
  tag_id uuid not null references public.question_bank_tags(id) on delete cascade,
  primary key(entry_id, tag_id)
);
create table if not exists public.student_question_bookmarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.question_bank_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(student_id, entry_id)
);
create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.question_bank_entries(id) on delete cascade,
  reason text not null check (reason in ('incorrect_answer','unclear_question','translation_issue','duplicate','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists question_bank_exam_status_idx on public.question_bank_entries(exam_id, status, created_at desc);
create index if not exists question_bank_syllabus_idx on public.question_bank_entries(syllabus_item_id);
create index if not exists question_bank_source_year_idx on public.question_bank_entries(source_type, exam_year);
create index if not exists question_bank_translations_language_idx on public.question_bank_translations(language, entry_id);
create index if not exists question_bank_bookmarks_student_idx on public.student_question_bookmarks(student_id, created_at desc);
create index if not exists question_reports_status_idx on public.question_reports(status, created_at desc);
alter table public.question_bank_entries enable row level security;
alter table public.question_bank_translations enable row level security;
alter table public.question_bank_tags enable row level security;
alter table public.question_bank_entry_tags enable row level security;
alter table public.student_question_bookmarks enable row level security;
alter table public.question_reports enable row level security;
grant select, insert, update, delete on public.question_bank_entries, public.question_bank_translations, public.question_bank_tags, public.question_bank_entry_tags, public.student_question_bookmarks, public.question_reports to authenticated;
create policy "Admins manage question bank entries" on public.question_bank_entries for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Students read published question bank entries" on public.question_bank_entries for select to authenticated using (status = 'published');
create policy "Admins manage question bank translations" on public.question_bank_translations for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Students read translations of published entries" on public.question_bank_translations for select to authenticated using (exists (select 1 from public.question_bank_entries e where e.id = entry_id and e.status = 'published'));
create policy "Admins manage question bank tags" on public.question_bank_tags for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Students read question bank tags" on public.question_bank_tags for select to authenticated using (true);
create policy "Admins manage question bank entry tags" on public.question_bank_entry_tags for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Students read tags for published entries" on public.question_bank_entry_tags for select to authenticated using (exists (select 1 from public.question_bank_entries e where e.id = entry_id and e.status = 'published'));
create policy "Students manage own question bookmarks" on public.student_question_bookmarks for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()) and exists (select 1 from public.question_bank_entries e where e.id = entry_id and e.status = 'published'));
create policy "Students create own question reports" on public.question_reports for insert to authenticated with check (student_id = (select auth.uid()) and exists (select 1 from public.question_bank_entries e where e.id = entry_id and e.status = 'published'));
create policy "Students read own question reports" on public.question_reports for select to authenticated using (student_id = (select auth.uid()));
create policy "Admins manage question reports" on public.question_reports for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
