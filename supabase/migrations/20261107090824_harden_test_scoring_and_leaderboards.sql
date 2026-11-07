create or replace function public.start_lecture_test(p_test_id uuid)
returns table (attempt_id uuid, question_id uuid, question_text text, options jsonb, sort_order integer, seconds_per_question integer, question_count integer)
language plpgsql security definer set search_path = public
as $$
declare v_attempt uuid; v_test public.tests%rowtype; v_user uuid := auth.uid(); v_linked integer; v_invalid integer;
begin
  if v_user is null then raise exception 'Please sign in to start the test'; end if;
  select t.* into v_test from public.tests t
  join public.lectures l on l.id=t.lecture_id
  join public.chapters c on c.id=l.chapter_id
  join public.subjects s on s.id=c.subject_id
  where t.id=p_test_id and t.published and l.published and s.published;
  if not found then raise exception 'Test is not available'; end if;
  select count(*) into v_linked from public.test_questions tq where tq.test_id=p_test_id;
  if v_linked <> v_test.question_count then raise exception 'This test is not configured correctly. Please contact the administrator.'; end if;
  select count(*) into v_invalid from public.test_questions tq join public.questions q on q.id=tq.question_id
  where tq.test_id=p_test_id and q.lecture_id <> v_test.lecture_id;
  if v_invalid > 0 then raise exception 'This test contains questions from another lecture.'; end if;
  insert into public.attempts(test_id,student_id) values(p_test_id,v_user) returning id into v_attempt;
  return query select v_attempt,q.id,q.question_text,q.options,tq.sort_order,v_test.seconds_per_question,v_test.question_count
  from public.test_questions tq join public.questions q on q.id=tq.question_id where tq.test_id=p_test_id order by tq.sort_order;
end; $$;

create or replace function public.save_lecture_test_answer(p_attempt_id uuid,p_question_id uuid,p_selected_option integer,p_time_spent_seconds integer default 0)
returns void language plpgsql security definer set search_path=public
as $$
declare v_attempt public.attempts%rowtype; v_duration integer; v_correct integer;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if p_selected_option not between 0 and 3 then raise exception 'Invalid option'; end if;
  select a.* into v_attempt from public.attempts a where a.id=p_attempt_id and a.student_id=auth.uid() for update;
  if not found or v_attempt.status <> 'in_progress' then raise exception 'Attempt is not active'; end if;
  select t.question_count*t.seconds_per_question into v_duration from public.tests t where t.id=v_attempt.test_id;
  if now() > v_attempt.started_at + make_interval(secs=>v_duration) then raise exception 'Test time has expired'; end if;
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
declare v_attempt public.attempts%rowtype; v_total integer; v_correct integer; v_wrong integer; v_unanswered integer; v_duration integer; v_mc numeric; v_mw numeric; v_score numeric; v_elapsed integer;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  select a.* into v_attempt from public.attempts a where a.id=p_attempt_id and a.student_id=auth.uid() for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status <> 'in_progress' then
    return query select v_attempt.score,v_attempt.correct_count,v_attempt.wrong_count,v_attempt.unanswered_count,coalesce(v_attempt.time_taken_seconds,0); return;
  end if;
  select t.question_count*t.seconds_per_question,t.marks_correct,t.marks_wrong into v_duration,v_mc,v_mw from public.tests t where t.id=v_attempt.test_id;
  select count(*) into v_total from public.test_questions where test_id=v_attempt.test_id;
  if v_total = 0 then raise exception 'Test has no configured questions'; end if;
  if v_total <> (select question_count from public.tests where id=v_attempt.test_id) then raise exception 'Test question count does not match configuration'; end if;
  select count(*) filter(where r.is_correct),count(*) filter(where not r.is_correct) into v_correct,v_wrong
  from public.responses r join public.test_questions tq on tq.test_id=v_attempt.test_id and tq.question_id=r.question_id
  where r.attempt_id=p_attempt_id and r.selected_option is not null;
  v_correct:=coalesce(v_correct,0); v_wrong:=coalesce(v_wrong,0); v_unanswered:=greatest(0,v_total-v_correct-v_wrong);
  v_score:=v_correct*v_mc-v_wrong*v_mw;
  v_elapsed:=least(v_duration,greatest(0,extract(epoch from(now()-v_attempt.started_at))::integer));
  update public.attempts set submitted_at=now(),score=v_score,correct_count=v_correct,wrong_count=v_wrong,unanswered_count=v_unanswered,
    time_taken_seconds=v_elapsed,status=case when now()>started_at+make_interval(secs=>v_duration) then 'expired' else 'submitted' end where id=p_attempt_id;
  return query select v_score,v_correct,v_wrong,v_unanswered,v_elapsed;
end; $$;

create or replace function public.get_lecture_test_review(p_attempt_id uuid)
returns table(question_id uuid,question_text text,options jsonb,correct_option integer,explanation text,selected_option integer,is_correct boolean,sort_order integer)
language sql security definer set search_path=public
as $$
 select q.id,q.question_text,q.options,q.correct_option,q.explanation,r.selected_option,r.is_correct,tq.sort_order
 from public.attempts a join public.test_questions tq on tq.test_id=a.test_id join public.questions q on q.id=tq.question_id
 left join public.responses r on r.attempt_id=a.id and r.question_id=q.id
 where a.id=p_attempt_id and a.student_id=auth.uid() and a.status in('submitted','expired')
 order by tq.sort_order;
$$;

create or replace function public.student_leaderboards()
returns table(scope text,scope_name text,student_id uuid,student_name text,tests_taken bigint,average_percentage numeric,rank bigint)
language sql security definer set search_path=public
as $$
 with completed as (
  select a.student_id,coalesce(nullif(p.full_name,''),'Student') as student_name,s.id subject_id,s.title subject_name,
         l.id lecture_id,l.title lecture_name,a.score,
         case when t.marks_correct>0 then (t.question_count*t.marks_correct) else 0 end as max_score
  from public.attempts a join public.tests t on t.id=a.test_id join public.lectures l on l.id=t.lecture_id
  join public.chapters c on c.id=l.chapter_id join public.subjects s on s.id=c.subject_id
  join public.profiles p on p.id=a.student_id
  where a.status in('submitted','expired') and a.submitted_at is not null
 ), aggregated as (
  select 'subject'::text scope,subject_name scope_name,student_id,student_name,count(*) tests_taken,
    round(avg(case when max_score>0 then greatest(0,least(100,score/max_score*100)) else 0 end),2) average_percentage
  from completed group by subject_id,subject_name,student_id,student_name
  union all
  select 'lecture'::text,lecture_name,student_id,student_name,count(*),
    round(avg(case when max_score>0 then greatest(0,least(100,score/max_score*100)) else 0 end),2)
  from completed group by lecture_id,lecture_name,student_id,student_name
 )
 select scope,scope_name,student_id,student_name,tests_taken,average_percentage,
 dense_rank() over(partition by scope,scope_name order by average_percentage desc,tests_taken desc)
 from aggregated;
$$;

revoke all on function public.start_lecture_test(uuid) from public,anon;
revoke all on function public.save_lecture_test_answer(uuid,uuid,integer,integer) from public,anon;
revoke all on function public.submit_lecture_test(uuid) from public,anon;
revoke all on function public.get_lecture_test_review(uuid) from public,anon;
revoke all on function public.student_leaderboards() from public,anon;
grant execute on function public.start_lecture_test(uuid) to authenticated;
grant execute on function public.save_lecture_test_answer(uuid,uuid,integer,integer) to authenticated;
grant execute on function public.submit_lecture_test(uuid) to authenticated;
grant execute on function public.get_lecture_test_review(uuid) to authenticated;
grant execute on function public.student_leaderboards() to authenticated;