create or replace function public.start_lecture_test(p_test_id uuid)
returns table (attempt_id uuid, question_id uuid, question_text text, options jsonb, sort_order integer, seconds_per_question integer, question_count integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_attempt uuid;
  v_test public.tests%rowtype;
  v_user uuid := auth.uid();
  v_linked integer;
  v_invalid integer;
begin
  if v_user is null then raise exception 'Please sign in to start the test'; end if;
  select t.* into v_test
  from public.tests t
  join public.lectures l on l.id=t.lecture_id
  join public.chapters c on c.id=l.chapter_id
  join public.subjects s on s.id=c.subject_id
  where t.id=p_test_id and t.published=true and l.published=true and s.published=true;
  if not found then raise exception 'Test is not available'; end if;

  select count(*) into v_linked from public.test_questions tq where tq.test_id=p_test_id;
  if v_linked <> v_test.question_count then
    raise exception 'This test is not configured correctly. Please contact the administrator.';
  end if;

  select count(*) into v_invalid
  from public.test_questions tq
  join public.questions q on q.id=tq.question_id
  where tq.test_id=p_test_id and q.lecture_id <> v_test.lecture_id;
  if v_invalid > 0 then
    raise exception 'This test contains questions from another lecture.';
  end if;

  insert into public.attempts(test_id,student_id) values (p_test_id,v_user) returning id into v_attempt;
  return query
    select v_attempt,q.id,q.question_text,q.options,tq.sort_order,v_test.seconds_per_question,v_test.question_count
    from public.test_questions tq
    join public.questions q on q.id=tq.question_id
    where tq.test_id=p_test_id
    order by tq.sort_order;
end;
$$;