create table if not exists public.exams (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, short_name text not null,
 description text, display_order integer not null default 0, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.exam_syllabus (
 id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade,
 subject_id uuid references public.subjects(id) on delete set null, chapter_id uuid references public.chapters(id) on delete set null,
 title text not null, title_hi text, level text not null default 'topic' check(level in ('subject','chapter','topic')),
 source_status text not null default 'draft' check(source_status in ('draft','verified')), official_source_url text,
 display_order integer not null default 0, is_published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.student_exam_selections (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references auth.users(id) on delete cascade,
 exam_id uuid not null references public.exams(id) on delete cascade, target_date date, created_at timestamptz not null default now(),
 unique(student_id,exam_id)
);
create table if not exists public.student_syllabus_progress (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references auth.users(id) on delete cascade,
 syllabus_item_id uuid not null references public.exam_syllabus(id) on delete cascade,
 status text not null default 'not_started' check(status in ('not_started','in_progress','completed')),
 updated_at timestamptz not null default now(), unique(student_id,syllabus_item_id)
);
create index if not exists exam_syllabus_exam_order_idx on public.exam_syllabus(exam_id,display_order);
create index if not exists student_exam_selections_student_idx on public.student_exam_selections(student_id);
create index if not exists student_syllabus_progress_student_idx on public.student_syllabus_progress(student_id);
alter table public.exams enable row level security; alter table public.exam_syllabus enable row level security;
alter table public.student_exam_selections enable row level security; alter table public.student_syllabus_progress enable row level security;
create policy "Active exams are readable" on public.exams for select to authenticated using(is_active);
create policy "Published syllabus is readable" on public.exam_syllabus for select to authenticated using(is_published and exists(select 1 from public.exams e where e.id=exam_id and e.is_active));
create policy "Students read own exam selections" on public.student_exam_selections for select to authenticated using(student_id=auth.uid());
create policy "Students create own exam selections" on public.student_exam_selections for insert to authenticated with check(student_id=auth.uid());
create policy "Students update own exam selections" on public.student_exam_selections for update to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid());
create policy "Students delete own exam selections" on public.student_exam_selections for delete to authenticated using(student_id=auth.uid());
create policy "Students read own syllabus progress" on public.student_syllabus_progress for select to authenticated using(student_id=auth.uid());
create policy "Students create own syllabus progress" on public.student_syllabus_progress for insert to authenticated with check(student_id=auth.uid());
create policy "Students update own syllabus progress" on public.student_syllabus_progress for update to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid());
grant select on public.exams,public.exam_syllabus to authenticated;
grant select,insert,update,delete on public.student_exam_selections to authenticated;
grant select,insert,update on public.student_syllabus_progress to authenticated;
insert into public.exams(slug,title,short_name,description,display_order) values
('cgl','Combined Graduate Level Examination','SSC CGL','For graduate-level recruitment to Group B and Group C posts.',1),
('chsl','Combined Higher Secondary Level Examination','SSC CHSL','For recruitment to Data Entry Operator, Lower Division Clerk and related posts.',2),
('cpo','Central Police Organisation Examination','SSC CPO','For Sub-Inspector recruitment in Delhi Police and CAPFs.',3),
('mts','Multi-Tasking Staff Examination','SSC MTS','For Multi-Tasking Staff and Havaldar recruitment.',4),
('gd','Constable (General Duty) Examination','SSC GD','For Constable (GD) recruitment in CAPFs and other forces.',5),
('stenographer','Stenographer Grade C & D Examination','SSC Stenographer','For Stenographer Grade C and Grade D posts.',6),
('selection-post','Selection Post Examination','SSC Selection Post','For region-wise Selection Post recruitment across different levels.',7)
on conflict(slug) do update set title=excluded.title,short_name=excluded.short_name,description=excluded.description,display_order=excluded.display_order,is_active=true;
