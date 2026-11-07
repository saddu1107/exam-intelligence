create or replace function public.student_leaderboards()
returns table (scope text, scope_name text, student_id uuid, student_name text, tests_taken bigint, average_percentage numeric, rank bigint)
language sql security definer set search_path=public
as $$
 with completed as (
   select a.student_id, coalesce(nullif(p.full_name,''),'Student') as student_name,
          s.id as subject_id,s.title as subject_name,l.id as lecture_id,l.title as lecture_name,
          a.score, (t.question_count*t.marks_correct) as max_score
   from public.attempts a join public.tests t on t.id=a.test_id
   join public.lectures l on l.id=t.lecture_id join public.chapters c on c.id=l.chapter_id
   join public.subjects s on s.id=c.subject_id join public.profiles p on p.id=a.student_id
   where a.status in ('submitted','expired') and a.submitted_at is not null
 ), aggregated as (
   select 'subject'::text as scope, subject_name as scope_name, student_id, student_name,count(*) as tests_taken,
          round(avg(case when max_score>0 then greatest(0,least(100,score/max_score*100)) else 0 end),2) as average_percentage
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
revoke all on function public.student_leaderboards() from public,anon;
grant execute on function public.student_leaderboards() to authenticated;