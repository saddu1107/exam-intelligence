-- Persist question review flags for resumable attempts.
alter table public.attempts add column if not exists reviewed_question_ids uuid[] not null default '{}';
create or replace function public.set_lecture_test_review_flag(p_attempt_id uuid,p_question_id uuid,p_marked boolean)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if not exists(select 1 from public.attempts a join public.test_questions tq on tq.test_id=a.test_id
  where a.id=p_attempt_id and a.student_id=auth.uid() and a.status='in_progress' and tq.question_id=p_question_id) then
  raise exception 'Question is not part of an active attempt';
 end if;
 if p_marked then
  update public.attempts set reviewed_question_ids=array(select distinct unnest(reviewed_question_ids||array[p_question_id])) where id=p_attempt_id;
 else
  update public.attempts set reviewed_question_ids=array_remove(reviewed_question_ids,p_question_id) where id=p_attempt_id;
 end if;
end; $$;
grant execute on function public.set_lecture_test_review_flag(uuid,uuid,boolean) to authenticated;
