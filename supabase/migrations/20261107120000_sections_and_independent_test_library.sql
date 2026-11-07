-- Add top-level learning sections and independent tests while preserving existing records.
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  description text, sort_order integer not null default 0, published boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.sections(title,slug,description,sort_order,published) values
 ('General Studies','gs','General Studies subjects',1,true),
 ('Reasoning','reasoning','Verbal and non-verbal reasoning',2,true),
 ('Mathematics','mathematics','Quantitative aptitude',3,true),
 ('English','english','English language and comprehension',4,true)
on conflict (slug) do update set title=excluded.title,sort_order=excluded.sort_order;
alter table public.subjects add column if not exists section_id uuid references public.sections(id) on delete set null;
update public.subjects set section_id=(select id from public.sections where slug='gs')
where section_id is null and slug in ('indian-polity','history','geography','economics','general-science','environment','current-affairs','static-gk');
insert into public.subjects(title,slug,description,published,section_id)
select v.title,v.slug,v.description,false,s.id from (values
 ('Reasoning','reasoning','Verbal and non-verbal reasoning topics'),
 ('Mathematics','mathematics','Arithmetic and advanced mathematics'),
 ('English','english','Grammar, vocabulary and comprehension')
) v(title,slug,description) join public.sections s on s.slug=v.slug
on conflict (slug) do update set section_id=excluded.section_id;
alter table public.tests alter column lecture_id drop not null;
alter table public.tests add column if not exists subject_id uuid references public.subjects(id) on delete set null;
alter table public.tests add column if not exists chapter_id uuid references public.chapters(id) on delete set null;
alter table public.tests add column if not exists section_id uuid references public.sections(id) on delete set null;
alter table public.questions alter column lecture_id drop not null;
create table if not exists public.lecture_tests (
 lecture_id uuid not null references public.lectures(id) on delete cascade,
 test_id uuid not null references public.tests(id) on delete cascade,
 sort_order integer not null default 0, created_at timestamptz not null default now(),
 primary key (lecture_id,test_id)
);
insert into public.lecture_tests(lecture_id,test_id,sort_order) select lecture_id,id,0 from public.tests where lecture_id is not null on conflict do nothing;
update public.tests t set subject_id=c.subject_id,section_id=s.section_id,chapter_id=c.id
from public.lectures l join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id
where t.lecture_id=l.id and (t.subject_id is null or t.section_id is null or t.chapter_id is null);
alter table public.sections enable row level security;
alter table public.lecture_tests enable row level security;
drop policy if exists "Public can read published tests" on public.tests;
drop policy if exists "Students can read published tests" on public.tests;
drop policy if exists "Students can read questions for published tests" on public.test_questions;
create policy "Anyone can read published sections" on public.sections for select using (published=true);
create policy "Admins manage sections" on public.sections for all using (public.is_admin()) with check (public.is_admin());
create policy "Anyone can read published tests v2" on public.tests for select using (
 published=true and (
  (lecture_id is not null and exists(select 1 from public.lectures l join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id where l.id=tests.lecture_id and l.published=true and s.published=true))
  or (subject_id is not null and exists(select 1 from public.subjects s where s.id=tests.subject_id and s.published=true))
  or (section_id is not null and exists(select 1 from public.sections x where x.id=tests.section_id and x.published=true))
  or exists(select 1 from public.lecture_tests lt join public.lectures l on l.id=lt.lecture_id join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id where lt.test_id=tests.id and l.published=true and s.published=true)
 ));
create policy "Read lecture test links for published content" on public.lecture_tests for select using (
 exists(select 1 from public.tests t where t.id=lecture_tests.test_id and t.published=true)
 and exists(select 1 from public.lectures l join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id where l.id=lecture_tests.lecture_id and l.published=true and s.published=true));
create policy "Admins manage lecture test links" on public.lecture_tests for all using (public.is_admin()) with check (public.is_admin());
create policy "Read test question links for published tests v2" on public.test_questions for select using (exists(select 1 from public.tests t where t.id=test_questions.test_id and t.published=true));
create or replace function public.start_lecture_test(p_test_id uuid)
returns table(attempt_id uuid,question_id uuid,question_text text,options jsonb,sort_order integer,seconds_per_question integer,question_count integer)
language plpgsql security definer set search_path=public as $$
declare v_attempt uuid; v_test public.tests%rowtype; v_linked integer;
begin
 if auth.uid() is null then raise exception 'Please sign in to start the test'; end if;
 select t.* into v_test from public.tests t where t.id=p_test_id and t.published and (
  (t.lecture_id is not null and exists(select 1 from public.lectures l join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id where l.id=t.lecture_id and l.published and s.published))
  or (t.subject_id is not null and exists(select 1 from public.subjects s where s.id=t.subject_id and s.published))
  or (t.section_id is not null and exists(select 1 from public.sections x where x.id=t.section_id and x.published))
  or exists(select 1 from public.lecture_tests lt join public.lectures l on l.id=lt.lecture_id join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id where lt.test_id=t.id and l.published and s.published));
 if not found then raise exception 'Test is not available'; end if;
 select count(*) into v_linked from public.test_questions where test_id=p_test_id;
 if v_linked<>v_test.question_count then raise exception 'This test is not configured correctly. Please contact the administrator.'; end if;
 insert into public.attempts(test_id,student_id) values(p_test_id,auth.uid()) returning id into v_attempt;
 return query select v_attempt,q.id,q.question_text,q.options,tq.sort_order,v_test.seconds_per_question,v_test.question_count
 from public.test_questions tq join public.questions q on q.id=tq.question_id where tq.test_id=p_test_id order by tq.sort_order;
end; $$;
create or replace function public.student_leaderboards()
returns table(scope text,scope_name text,student_id uuid,student_name text,tests_taken bigint,average_percentage numeric,rank bigint)
language sql security definer set search_path=public as $$
 with completed as (
  select a.student_id,coalesce(nullif(p.full_name,''),'Student') student_name,coalesce(s.id,t.subject_id) subject_id,
   coalesce(s.title,t_subject.title,'General') subject_name,coalesce(l.id,lt.lecture_id) lecture_id,
   coalesce(l.title,'Independent test') lecture_name,a.score,(t.question_count*t.marks_correct) max_score
  from public.attempts a join public.tests t on t.id=a.test_id join public.profiles p on p.id=a.student_id
  left join public.lectures l on l.id=t.lecture_id left join public.chapters c on c.id=l.chapter_id
  left join public.subjects s on s.id=c.subject_id left join public.subjects t_subject on t_subject.id=t.subject_id
  left join lateral(select lecture_id from public.lecture_tests x where x.test_id=t.id order by sort_order limit 1) lt on true
  where a.status in('submitted','expired') and a.submitted_at is not null
 ), aggregated as (
  select 'subject'::text scope,subject_name scope_name,student_id,student_name,count(*) tests_taken,
   round(avg(case when max_score>0 then greatest(0,least(100,score/max_score*100)) else 0 end),2) average_percentage
  from completed group by subject_id,subject_name,student_id,student_name
  union all
  select 'lecture'::text,lecture_name,student_id,student_name,count(*),
   round(avg(case when max_score>0 then greatest(0,least(100,score/max_score*100)) else 0 end),2)
  from completed group by lecture_id,lecture_name,student_id,student_name
 ) select scope,scope_name,student_id,student_name,tests_taken,average_percentage,
 dense_rank() over(partition by scope,scope_name order by average_percentage desc,tests_taken desc) from aggregated;
$$;
grant select on public.sections,public.lecture_tests to anon,authenticated;
