# EXAM INTELLIGENCE — Draft 4 Roadmap & Implementation Backlog

## Product decisions (locked)
- Free platform: no paywall for essential learning or tests.
- Bilingual: Hindi and English.
- PYQs: cover all SSC exam categories — CGL, CHSL, CPO, MTS, GD, Stenographer and Selection Post.
- Tests: sectional, chapter-wise and topic-wise in the initial test centre; full-length mocks are out of initial scope.
- Content: verified PYQs plus original in-house questions. Licensed third-party question banks are out of scope unless separately approved.
- Deployment: development branch and preview deployments only. Do not merge to main or deploy production without explicit approval.

## Roadmap
1. Phase 3 — Admin panel completion and authorization.
2. Phase 4 — Smart student dashboard: continue learning, recent tests, goals, subject progress and recommendations.
3. Phase 5 — SSC Exam Centre: exam catalogue, syllabus mapping and progress tracking for all seven SSC exam categories.
4. Phase 6 — Bilingual Question Bank: linked Hindi/English versions, PYQ provenance, topic tags, explanations, bookmarks and question reports.
5. Phase 7 — Sectional Test Centre: chapter/topic/subject tests, timed attempts, analytics, retakes and incorrect-question practice.
6. Phase 8 — PWA and accessibility: installability, low-bandwidth optimization, selected offline notes and accessibility.
7. Phase 9 — AI Learning Assistant: bilingual explanations, similar practice questions and revision suggestions; no student paywall.
8. Phase 10 — QA and launch readiness: security, accuracy, accessibility, mobile, performance, backup and recovery checks.

## Implementation backlog

### P0 — Admin control room
- [x] Shared admin shell matches the student navy/cyan visual system.
- [x] Shared admin shell verifies authenticated user and the existing `is_admin` RPC before rendering admin routes.
- [x] Existing admin page-level role checks retained as defense in depth.
- [ ] Verify admin RLS policies for every write table and storage bucket.
- [ ] Verify deployment preview and test admin/non-admin/anonymous access.
- [ ] Review destructive actions and add safer archive/confirmation flows where needed.

### P1 — Exam and content foundation
- [x] Define canonical exam identifiers and link syllabus items to existing subjects/chapters.
- [x] Additive Phase 5 migration for `exams`, `exam_syllabus`, `student_exam_selections` and `student_syllabus_progress`; remaining Phase 6 tables stay queued.
- [ ] Preserve existing subjects, chapters, questions, tests, attempts and responses.
- [ ] Add verified-source metadata and distinguish PYQs from original practice questions.
- [ ] Add admin filters and bulk import validation for exam/year/topic/language.

### P2 — Student experience
- [ ] Smart dashboard.
- [x] Seven-exam SSC Centre catalogue, target exam selection/date and syllabus progress UI (syllabus topics remain unpublished until verified).
- [ ] Bilingual question bank and search.
- [ ] Sectional test engine and detailed analytics.
- [ ] Bookmarks, incorrect-question revision and question reporting.

### P3 — Quality and enhancements
- [ ] PWA and low-bandwidth experience.
- [ ] AI assistant with bilingual SSC-style explanations.
- [ ] Accessibility, security, performance and content QA.

## Content acceptance standard
Every published question must have a verified source classification (PYQ or original), exam/year where applicable, subject/topic mapping, language linkage, options, correct answer and explanation. Never label an original question as a PYQ. A translated pair should share one logical question identity so scoring and analytics remain consistent.

## Release guardrails
- Work only on `feature/complete-learning-platform` for this milestone.
- Use Vercel preview deployments only.
- Do not merge to `main`, change production environment variables, or deploy production without explicit user approval.
- Apply database migrations only after reviewing compatibility and RLS impact.
