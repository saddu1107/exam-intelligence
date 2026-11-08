# Phase 1 — Security and Database Integrity

Status: **Partially complete; critical safe database fixes applied.**

## Scope and safety
- Repository: saddu1107/exam-intelligence
- Branch: feature/complete-learning-platform
- Supabase project: tsssqvkkzokeykqhxugo
- Vercel project: exam-intelligence
- Production was not modified or promoted.
- No student rows, question data, tests, attempts, or responses were deleted or rewritten.

## Applied database changes
1. Revoked inherited PUBLIC/anon EXECUTE permissions from:
   - pause_lecture_test(uuid)
   - resume_lecture_test(uuid)
   - save_lecture_test_position(uuid, integer, text)
   - clear_lecture_test_answer(uuid, uuid)
   - set_lecture_test_review_flag(uuid, uuid, boolean)
   Authenticated EXECUTE was retained because these are used by the signed-in test flow and their function bodies enforce attempt ownership and membership.
2. Added indexes for the previously unindexed referencing-side FK columns across subjects, tests, lecture_tests, exam_syllabus, student_exam_selections, question_bank_entries, question_bank_entry_tags, student_question_bookmarks, question_reports, and student_syllabus_progress.
3. Rewrote selected RLS expressions to use cached auth helper calls: profiles admin-read and own-update; student_exam_selections select/insert/update/delete; student_syllabus_progress select/insert/update.
4. Restricted is_admin() from PUBLIC/anon while retaining authenticated access required by app/admin/page.tsx.

## Verification evidence
- Supabase migration phase_1_security_database_hardening applied successfully.
- Supabase migration phase_1_student_syllabus_progress_fk_index applied successfully.
- Supabase migration phase_1_rls_auth_initplan_and_admin_rpc applied successfully.
- Post-change ACL query: targeted test-control RPCs have EXECUTE for authenticated and postgres only; PUBLIC/anon entries absent.
- Post-change ACL query: is_admin() has EXECUTE for authenticated and postgres only.
- Post-change FK coverage query returned an empty result set.
- RLS policy query confirmed the updated auth helper expressions.
- Supabase health advisor: no findings.
- Supabase performance advisor: missing-FK-index finding cleared; remaining items include multiple-permissive-policy warnings and an unused-index advisory. Index removal was intentionally avoided.
- Supabase security advisor still reports 11 authenticated SECURITY DEFINER functions. These include core app RPCs used by the test engine/dashboard/admin gate. They need per-function review and redesign or documented acceptance; blanket revocation would break existing features. Leaked-password protection remains disabled.
- Vercel deployment created from commit 1471d63ff29217b9de33984dfe92d1ad4833661d is READY.
- No runtime error records were returned in the recent seven-day project scan (this is not a substitute for interactive testing).

## Not completed / blockers
- Auth leaked-password protection requires Auth dashboard configuration; it was not changed.
- Dependencies still use `latest` in package.json and the branch does not contain pnpm-lock.yaml. A reproducible lockfile/pinned-version change was not made because the isolated Vercel sandbox provisioning attempt failed (image not found); no speculative dependency upgrades were committed.
- Full student/admin end-to-end smoke testing is still required after these database changes.
- Multiple-permissive-policy findings need policy consolidation only after access semantics are mapped and tested.
- Remaining SECURITY DEFINER RPCs need deeper review. Do not blanket-revoke or change them to SECURITY INVOKER without reviewing all call sites and data-access implications.

## Recommended next actions
1. Use a working isolated Node.js environment to pin verified dependency versions and generate/commit the matching lockfile.
2. Enable leaked-password protection in Supabase Auth settings and confirm the setting.
3. Review the 11 authenticated SECURITY DEFINER functions one by one; retain only those whose authorization checks and return data are safe for every signed-in account.
4. Perform student and admin preview smoke tests (login, admin access, start/save/pause/resume/submit/review test, dashboard leaderboard, profile reads/updates, exam selection and progress).
5. Re-run security/performance/health advisors after the remaining fixes.
