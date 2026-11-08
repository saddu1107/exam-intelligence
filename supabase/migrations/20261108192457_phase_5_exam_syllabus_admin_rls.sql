grant select, insert, update, delete on public.exams to authenticated;
grant select, insert, update, delete on public.exam_syllabus to authenticated;

drop policy if exists "Admins manage exams" on public.exams;
create policy "Admins manage exams"
on public.exams
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins manage exam syllabus" on public.exam_syllabus;
create policy "Admins manage exam syllabus"
on public.exam_syllabus
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
