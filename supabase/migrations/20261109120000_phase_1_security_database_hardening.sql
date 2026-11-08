-- Phase 1: security and database integrity hardening
-- Additive and safe: no table or student records are deleted or rewritten.

-- Student-facing test-control RPCs must be callable by authenticated users only.
-- Keep authenticated grants because the student test page uses these RPCs.
revoke execute on function public.pause_lecture_test(uuid) from public, anon;
revoke execute on function public.resume_lecture_test(uuid) from public, anon;
revoke execute on function public.save_lecture_test_position(uuid, integer, text) from public, anon;
revoke execute on function public.clear_lecture_test_answer(uuid, uuid) from public, anon;
revoke execute on function public.set_lecture_test_review_flag(uuid, uuid, boolean) from public, anon;

grant execute on function public.pause_lecture_test(uuid) to authenticated;
grant execute on function public.resume_lecture_test(uuid) to authenticated;
grant execute on function public.save_lecture_test_position(uuid, integer, text) to authenticated;
grant execute on function public.clear_lecture_test_answer(uuid, uuid) to authenticated;
grant execute on function public.set_lecture_test_review_flag(uuid, uuid, boolean) to authenticated;

-- Index referencing-side FK columns not already covered by a usable index.
create index if not exists subjects_section_id_idx on public.subjects (section_id);
create index if not exists tests_chapter_id_idx on public.tests (chapter_id);
create index if not exists tests_section_id_idx on public.tests (section_id);
create index if not exists tests_subject_id_idx on public.tests (subject_id);
create index if not exists lecture_tests_test_id_idx on public.lecture_tests (test_id);
create index if not exists exam_syllabus_chapter_id_idx on public.exam_syllabus (chapter_id);
create index if not exists exam_syllabus_subject_id_idx on public.exam_syllabus (subject_id);
create index if not exists student_exam_selections_exam_id_idx on public.student_exam_selections (exam_id);
create index if not exists question_bank_entries_created_by_idx on public.question_bank_entries (created_by);
create index if not exists question_bank_entry_tags_tag_id_idx on public.question_bank_entry_tags (tag_id);
create index if not exists student_question_bookmarks_entry_id_idx on public.student_question_bookmarks (entry_id);
create index if not exists question_reports_entry_id_idx on public.question_reports (entry_id);
create index if not exists question_reports_student_id_idx on public.question_reports (student_id);

-- Document that the indexes above cover FK lookups/cascades and retain existing composite indexes.
