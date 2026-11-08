# Phase 1 — Security and Database Integrity

Status: **Database hardening complete; dependency commit and Auth dashboard setting remain pending.**

## Scope and safety
- Repository: saddu1107/exam-intelligence
- Branch: feature/complete-learning-platform
- Supabase project: tsssqvkkzokeykqhxugo
- Vercel project: exam-intelligence
- Production was not modified, merged, or promoted.
- No student rows, question data, tests, attempts, or responses were deleted or rewritten.

## Applied database changes
1. Revoked inherited PUBLIC/anon EXECUTE permissions from pause_lecture_test(uuid), resume_lecture_test(uuid), save_lecture_test_position(uuid, integer, text), clear_lecture_test_answer(uuid, uuid), and set_lecture_test_review_flag(uuid, uuid, boolean). Authenticated EXECUTE remains because these are required by the student test flow; each function checks auth.uid(), attempt ownership, and active attempt/question membership.
2. Added indexes for previously unindexed foreign-key columns across the affected public tables. The post-change FK coverage query returned no missing indexes.
3. Rewrote selected RLS expressions to use cached auth helper calls for profiles, student_exam_selections, and student_syllabus_progress.
4. Restricted is_admin() from PUBLIC/anon while retaining authenticated access required by app/admin/page.tsx.
5. Hardened student_leaderboards(): its query now filters source attempts to auth.uid() only. Previously it returned all students' names and performance data while the dashboard filtered in the browser. The current dashboard only renders the caller's own rankings.

## Verification evidence
- Supabase migrations applied successfully: phase_1_security_database_hardening, phase_1_student_syllabus_progress_fk_index, phase_1_rls_auth_initplan_and_admin_rpc, phase_1_scope_student_leaderboards.
- Targeted test-control RPC ACL checks: authenticated and postgres only; PUBLIC/anon absent.
- is_admin() ACL check: authenticated and postgres only.
- RLS checks confirm the updated cached auth helper expressions.
- Leaderboard function filters by (select auth.uid()); service-context verification returned zero rows, as expected without a student session.
- Supabase health advisor: no findings. Performance advisor's missing FK index findings cleared; some multiple-permissive-policy and unused-index notices remain. Index removal was intentionally avoided.
- Supabase security advisor still reports 11 authenticated SECURITY DEFINER RPCs. This is a generic warning, not proof that every function is vulnerable. Code review found app-facing functions check auth.uid(), attempt ownership or question membership; get_lecture_test_review() also requires owner and completed attempt. is_admin() checks the profile role. student_leaderboards() is now caller-scoped. handle_new_user and rls_auto_enable are trigger/event-trigger routines. Do not blanket-revoke authenticated access without replacing the app flows.

## Dependencies — verified locally, not committed
Exact direct package versions resolved and installed in an isolated Vercel sandbox:
- next 16.4.5
- react 19.3.1
- react-dom 19.3.1
- @supabase/supabase-js 2.119.0
- @types/node 26.6.6
- @types/react 19.3.0
- @types/react-dom 19.3.0
- eslint 9.39.5
- eslint-config-next 16.4.5
- typescript 6.0.3

npm run build passed with this resolved package set; npm audit --omit=dev --audit-level=high reported zero production dependency vulnerabilities. npm run lint does not pass because the upgraded React/ESLint rules flag existing setState-in-effect patterns in multiple existing components. No blanket lint suppression was added.

A 212 KB package-lock.json was generated in the isolated sandbox. However, the sandbox Git working copy has no configured commit identity and the connected GitHub file transport truncates large lockfiles. Therefore neither dependency pinning nor package-lock.json has been committed. Do not mark this item complete until both files are present on the development branch and Vercel builds from that commit.

## Auth leaked-password protection — pending dashboard configuration
Supabase security advisor continues to report leaked-password protection disabled. Documentation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Enable it in Supabase Dashboard → Authentication → Settings / Password Security.
- Supabase documentation states the feature is available on Pro plan and above.
- Supported Management API endpoint: PATCH /v1/projects/{ref}/config/auth. The connected tools do not expose a generic Management API request or plan-entitlement verification, so no internal Auth table or undocumented endpoint was modified.
- After enabling, re-run the security advisor and confirm the auth_leaked_password_protection warning is absent.

## Remaining actions
1. Transfer and commit the exact sandbox-verified package.json and complete package-lock.json to feature/complete-learning-platform; wait for Vercel preview deployment and verify READY.
2. Enable leaked-password protection through Supabase Auth dashboard if plan entitlement permits; re-run security advisor.
3. Perform authenticated browser smoke tests for login, test start/save/pause/resume/submit/review, dashboard own-rankings, admin access, profile, exam selection and syllabus progress.
4. Address remaining multiple-permissive-policy and React lint findings in separate reviewed changes.
