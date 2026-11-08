-- Add a narrowly scoped response-clear action for the test UI.
create or replace function public.clear_lecture_test_answer(p_attempt_id uuid,p_question_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if not exists(select 1 from public.attempts a join public.test_questions tq on tq.test_id=a.test_id
   where a.id=p_attempt_id and a.student_id=auth.uid() and a.status='in_progress' and tq.question_id=p_question_id) then
  raise exception 'Question is not part of an active attempt';
 end if;
 delete from public.responses where attempt_id=p_attempt_id and question_id=p_question_id;
end; $$;
grant execute on function public.clear_lecture_test_answer(uuid,uuid) to authenticated;
