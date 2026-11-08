-- Draft 6: additive pause/resume and attempt-recovery support.
-- Existing attempts and responses are preserved.
alter table public.tests
  add column if not exists test_mode text not null default 'practice'
  check (test_mode in ('practice','simulation'));

alter table public.attempts
  add column if not exists paused_at timestamptz,
  add column if not exists paused_seconds_total integer not null default 0 check (paused_seconds_total >= 0),
  add column if not exists current_question_index integer not null default 0 check (current_question_index >= 0),
  add column if not exists preferred_language text not null default 'en' check (preferred_language in ('en','hi'));

alter table public.attempts drop constraint if exists attempts_status_check;
alter table public.attempts add constraint attempts_status_check
  check (status in ('in_progress','paused','submitted','expired'));

create index if not exists attempts_student_active_idx
  on public.attempts(student_id,test_id,created_at desc)
  where status in ('in_progress','paused');

create or replace function public.pause_lecture_test(p_attempt_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare v_attempt public.attempts%rowtype; v_mode text;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 select * into v_attempt from public.attempts
 where id=p_attempt_id and student_id=auth.uid() for update;
 if not found then raise exception 'Attempt not found'; end if;
 if v_attempt.status <> 'in_progress' then raise exception 'Only an active attempt can be paused'; end if;
 select test_mode into v_mode from public.tests where id=v_attempt.test_id;
 if coalesce(v_mode,'practice') <> 'practice' then raise exception 'Pause is available only for practice tests'; end if;
 update public.attempts set status='paused',paused_at=now() where id=p_attempt_id;
end; $$;

create or replace function public.resume_lecture_test(p_test_id uuid)
returns table(attempt_id uuid,question_id uuid,question_text text,options jsonb,sort_order integer,seconds_per_question integer,question_count integer)
language plpgsql security definer set search_path=public
as $$
declare v_attempt public.attempts%rowtype; v_test public.tests%rowtype;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 select a.* into v_attempt from public.attempts a
 where a.test_id=p_test_id and a.student_id=auth.uid() and a.status in ('in_progress','paused')
 order by a.created_at desc limit 1 for update;
 if not found then raise exception 'No unfinished attempt to resume'; end if;
 if v_attempt.status='paused' then
  update public.attempts set status='in_progress',
   paused_seconds_total=paused_seconds_total+greatest(0,extract(epoch from(now()-paused_at))::integer),
   paused_at=null where id=v_attempt.id returning * into v_attempt;
 end if;
 select * into v_test from public.tests where id=p_test_id;
 return query
 select v_attempt.id,q.id,q.question_text,q.options,tq.sort_order,v_test.seconds_per_question,v_test.question_count
 from public.test_questions tq join public.questions q on q.id=tq.question_id
 where tq.test_id=p_test_id order by tq.sort_order;
end; $$;

create or replace function public.save_lecture_test_position(
 p_attempt_id uuid,p_question_index integer,p_language text default 'en'
) returns void language plpgsql security definer set search_path=public
as $$
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if p_question_index < 0 then raise exception 'Invalid question position'; end if;
 if p_language not in ('en','hi') then raise exception 'Invalid language'; end if;
 update public.attempts set current_question_index=p_question_index,preferred_language=p_language
 where id=p_attempt_id and student_id=auth.uid() and status='in_progress';
 if not found then raise exception 'Attempt is not active'; end if;
end; $$;

create or replace function public.start_lecture_test(p_test_id uuid)
returns table(attempt_id uuid,question_id uuid,question_text text,options jsonb,sort_order integer,seconds_per_question integer,question_count integer)
language plpgsql security definer set search_path=public
as $$
declare v_attempt uuid; v_test public.tests%rowtype; v_linked integer;
begin
 if auth.uid() is null then raise exception 'Please sign in to start the test'; end if;
 select t.* into v_test from public.tests t where t.id=p_test_id and t.published
 and (
  (t.lecture_id is not null and exists(select 1 from public.lectures l join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id where l.id=t.lecture_id and l.published and s.published))
  or (t.subject_id is not null and exists(select 1 from public.subjects s where s.id=t.subject_id and s.published))
  or (t.section_id is not null and exists(select 1 from public.sections x where x.id=t.section_id and x.published))
  or exists(select 1 from public.lecture_tests lt join public.lectures l on l.id=lt.lecture_id join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id where lt.test_id=t.id and l.published and s.published)
 );
 if not found then raise exception 'Test is not available'; end if;
 select count(*) into v_linked from public.test_questions tq where tq.test_id=p_test_id;
 if v_linked<>v_test.question_count then raise exception 'This test is not configured correctly. Please contact the administrator.'; end if;
 -- Never create a duplicate attempt when the student returns to an unfinished test.
 select a.id into v_attempt from public.attempts a
 where a.test_id=p_test_id and a.student_id=auth.uid() and a.status in ('in_progress','paused')
 order by a.created_at desc limit 1 for update;
 if v_attempt is null then
  insert into public.attempts(test_id,student_id) values(p_test_id,auth.uid()) returning id into v_attempt;
 else
  update public.attempts set status='in_progress',
   paused_seconds_total=paused_seconds_total+case when status='paused' and paused_at is not null then greatest(0,extract(epoch from(now()-paused_at))::integer) else 0 end,
   paused_at=null where id=v_attempt;
 end if;
 return query select v_attempt,q.id,q.question_text,q.options,tq.sort_order,v_test.seconds_per_question,v_test.question_count
 from public.test_questions tq join public.questions q on q.id=tq.question_id where tq.test_id=p_test_id order by tq.sort_order;
end; $$;

create or replace function public.save_lecture_test_answer(
 p_attempt_id uuid,p_question_id uuid,p_selected_option integer,p_time_spent_seconds integer default 0
) returns void language plpgsql security definer set search_path=public
as $$
declare v_attempt public.attempts%rowtype; v_duration integer; v_correct integer; v_elapsed integer;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if p_selected_option not between 0 and 3 then raise exception 'Invalid option'; end if;
 select a.* into v_attempt from public.attempts a where a.id=p_attempt_id and a.student_id=auth.uid() for update;
 if not found or v_attempt.status <> 'in_progress' then raise exception 'Attempt is not active'; end if;
 select t.question_count*t.seconds_per_question into v_duration from public.tests t where t.id=v_attempt.test_id;
 v_elapsed:=greatest(0,extract(epoch from(now()-v_attempt.started_at))::integer-v_attempt.paused_seconds_total);
 if v_elapsed>v_duration then raise exception 'Test time has expired'; end if;
 select q.correct_option into v_correct from public.test_questions tq join public.questions q on q.id=tq.question_id
 where tq.test_id=v_attempt.test_id and q.id=p_question_id;
 if not found then raise exception 'Question does not belong to this test'; end if;
 insert into public.responses(attempt_id,question_id,selected_option,is_correct,time_spent_seconds)
 values(p_attempt_id,p_question_id,p_selected_option,p_selected_option=v_correct,greatest(0,least(coalesce(p_time_spent_seconds,0),3600)))
 on conflict(attempt_id,question_id) do update set selected_option=excluded.selected_option,is_correct=excluded.is_correct,time_spent_seconds=excluded.time_spent_seconds;
end; $$;

create or replace function public.submit_lecture_test(p_attempt_id uuid)
returns table(score numeric,correct_count integer,wrong_count integer,unanswered_count integer,time_taken_seconds integer)
language plpgsql security definer set search_path=public
as $$
declare v_attempt public.attempts%rowtype; v_total integer; v_correct integer; v_wrong integer; v_unanswered integer;
 v_duration integer; v_mc numeric; v_mw numeric; v_score numeric; v_elapsed integer;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 select a.* into v_attempt from public.attempts a where a.id=p_attempt_id and a.student_id=auth.uid() for update;
 if not found then raise exception 'Attempt not found'; end if;
 if v_attempt.status not in ('in_progress','paused') then
  return query select v_attempt.score,v_attempt.correct_count,v_attempt.wrong_count,v_attempt.unanswered_count,coalesce(v_attempt.time_taken_seconds,0); return;
 end if;
 select t.question_count*t.seconds_per_question,t.marks_correct,t.marks_wrong into v_duration,v_mc,v_mw from public.tests t where t.id=v_attempt.test_id;
 select count(*) into v_total from public.test_questions where test_id=v_attempt.test_id;
 if v_total=0 then raise exception 'Test has no configured questions'; end if;
 if v_total<>(select question_count from public.tests where id=v_attempt.test_id) then raise exception 'Test question count does not match configuration'; end if;
 select count(*) filter(where r.is_correct),count(*) filter(where not r.is_correct) into v_correct,v_wrong
 from public.responses r join public.test_questions tq on tq.test_id=v_attempt.test_id and tq.question_id=r.question_id
 where r.attempt_id=p_attempt_id and r.selected_option is not null;
 v_correct:=coalesce(v_correct,0);v_wrong:=coalesce(v_wrong,0);v_unanswered:=greatest(0,v_total-v_correct-v_wrong);
 v_score:=v_correct*v_mc-v_wrong*v_mw;
 v_elapsed:=least(v_duration,greatest(0,extract(epoch from(now()-v_attempt.started_at))::integer-v_attempt.paused_seconds_total-
  case when v_attempt.status='paused' and v_attempt.paused_at is not null then greatest(0,extract(epoch from(now()-v_attempt.paused_at))::integer) else 0 end));
 update public.attempts set submitted_at=now(),score=v_score,correct_count=v_correct,wrong_count=v_wrong,unanswered_count=v_unanswered,
 time_taken_seconds=v_elapsed,status=case when v_elapsed>=v_duration then 'expired' else 'submitted' end,paused_at=null
 where id=p_attempt_id;
 return query select v_score,v_correct,v_wrong,v_unanswered,v_elapsed;
end; $$;

grant execute on function public.pause_lecture_test(uuid) to authenticated;
grant execute on function public.resume_lecture_test(uuid) to authenticated;
grant execute on function public.save_lecture_test_position(uuid,integer,text) to authenticated;
