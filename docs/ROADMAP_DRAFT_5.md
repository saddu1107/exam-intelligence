# EXAM INTELLIGENCE — Draft 5: Remaining Phases & Bilingual Test Experience

**Status:** Planning draft for review  
**Branch:** `feature/complete-learning-platform`  
**Product:** Free, mobile-first, bilingual SSC preparation platform  
**Tagline:** Prepare Smart. Perform Better.

This document expands the approved bilingual test-language behaviour and defines the remaining delivery scope from Phase 6 through Phase 10. It is a planning document, not a claim that the listed features are already implemented.

---

## 1. Product principles and locked decisions

- **Free access:** No paywall for essential learning, question practice or tests.
- **Languages:** Hindi and English. Both versions of a question represent one logical question.
- **Exam coverage:** SSC CGL, CHSL, CPO, MTS, GD, Stenographer and Selection Post.
- **Question content:** Verified previous-year questions (PYQs) and clearly labelled original in-house questions. Do not mislabel original questions as PYQs.
- **Test scope:** Sectional, subject-wise, chapter-wise and topic-wise tests. Full-length mock tests remain outside the initial test-centre scope unless separately approved.
- **Mobile-first:** Fast, readable and usable on low-end Android devices and slower connections.
- **Safe evolution:** Add to the existing platform; do not delete or silently rewrite existing subjects, chapters, questions, tests, attempts, responses or student records.
- **Release control:** Work on `feature/complete-learning-platform` and use preview deployments. No merge to `main`, production deployment, production configuration change or destructive data operation without explicit approval.

## 2. Approved bilingual test experience

### 2.1 Per-question language switch

During an active test, the student can switch the currently displayed question between English and Hindi. The control should be available at question level, without forcing the student to restart the test or change the entire test session.

**State that must remain unchanged when switching languages:**
- The student's selected option for that logical question.
- Current question number and question order.
- Remaining test time and the running timer.
- Attempt ID, test progress and answered/unanswered status.
- Marks, scoring rules and negative-marking rules.
- Review/bookmark state and the identity used by reports and analytics.

Switching language must be a presentation change only. It must not create a second question, a second response, a second attempt or a second score.

### 2.2 Translation and fallback rules

- English and Hindi translations share one stable question-bank entry ID.
- Each translation has its own question text, four options and explanation.
- Option ordering and option identity must map consistently between languages. The same option index must represent the same answer in both translations.
- If one translation is unavailable, show the available translation and a clear “translation not available” notice. Do not display blank text or silently substitute an unverified translation.
- Admin publication workflow should flag incomplete bilingual pairs. A question may only be published in one language if an admin explicitly chooses a single-language publication state; it must be clearly labelled as single-language.
- Corrections to a translation must not change the underlying correct answer unless the admin deliberately edits and revalidates the answer.

### 2.3 Attempt integrity and accessibility

- Save answers against the logical question ID, not the translation row.
- Language switching must not trigger answer submission or timer reset.
- Persist the selected display language for the active attempt, where practical, and restore it after refresh/re-entry.
- Provide keyboard-accessible controls, visible focus states and clear labels such as “English” and “हिन्दी”.
- Test on narrow Android screens and with slow network conditions.

### 2.4 Acceptance tests

A release is not accepted until tests confirm:
1. Select option B in English, switch to Hindi, and confirm the equivalent option remains selected.
2. Switch repeatedly between languages; timer and question number continue unchanged.
3. Navigate away and return; saved answer and language preference restore correctly.
4. Submit the test; score and answer review are identical regardless of display language.
5. Bookmark/report a question in either language; it appears as the same logical question.
6. A missing translation produces a clear fallback and does not break the test.
7. Concurrent saves, refreshes and slow connections do not duplicate responses or lose the selected answer.

---

## 3. Phase 6 — Bilingual Question Bank

**Current status:** Database foundation applied. Admin/student interfaces, import workflow and test integration remain to be built.

### Admin Question Bank Manager
- Create and edit one logical question entry.
- Select SSC exam, subject and optional verified syllabus topic.
- Set source type: PYQ or original in-house question.
- Require exam year for PYQs; capture source/provenance details for verification.
- Enter English and Hindi question text, four options, correct option and explanation separately.
- Keep option identity/order aligned across translations.
- Add topic tags and difficulty.
- Support draft, review, approved, published and archived states.
- Show translation completeness and validation errors before publication.
- Add safe archive/confirmation flows; avoid irreversible deletion.

### Student Question Bank
- Search and filter by exam, subject, chapter/topic, year, source type, difficulty and language availability.
- Offer English, Hindi and (where supported) side-by-side viewing.
- Support question bookmarks, reports and clear explanation display.
- Keep original questions visibly distinct from PYQs.
- Respect published-only access and existing row-level security rules.

### Bulk import
- Provide a documented CSV template for bilingual content.
- Validate required fields, four options per language, answer range, PYQ year, source type, duplicate candidates and translation alignment.
- Preview valid and invalid rows before import; provide row-level error messages.
- Support safe batch sizes and avoid partial imports without a clear result summary.
- Never bulk-publish unreviewed content by default.

### Phase 6 exit criteria
- Admin can create, edit, review, publish and archive questions.
- Student can search, practise, bookmark and report published questions.
- Hindi/English pairs share one identity and aligned options.
- Import validation is tested with valid, invalid, duplicate and incomplete bilingual rows.
- Existing legacy question/test/attempt data remains intact.

---

## 4. Phase 7 — Sectional Test Centre and learning analytics

### Test creation and assignment
- Admin can build tests from approved/published question-bank entries.
- Support subject-wise, chapter-wise, topic-wise and sectional tests.
- Configure duration, question count, marks, negative marking, instructions and availability.
- Keep full-length mock tests out of this initial phase unless separately approved.
- Preserve the legacy test engine and existing attempts; use an additive integration/mapping strategy for question-bank tests.

### Test-taking experience
- Display one question at a time with question palette/navigation.
- Support mark-for-review, clear response, next/previous and submit confirmation.
- Include the approved per-question English/Hindi switch described in Section 2.
- Save responses reliably and prevent duplicate submissions.
- Show timer, answered/unanswered/review counts and connection/save status.
- Handle expiry and submission consistently.

### Results and analytics
- Show score, accuracy, attempted/unattempted questions, time spent and topic-wise performance.
- Provide answer review with the student's response, correct answer and explanation in the chosen language.
- Offer retakes without overwriting earlier attempts.
- Identify weak topics and allow incorrect-question practice.
- Keep analytics attached to the logical question identity across both languages.
- Clearly distinguish practice performance from official exam outcomes.

### Phase 7 exit criteria
- Admin-created tests use approved bank questions and validated settings.
- Timed attempts, autosave, submission, review and retakes work reliably.
- Language switching passes every acceptance test in Section 2.4.
- Analytics reconcile with stored responses and scoring rules.
- Legacy tests and historical attempts still work.

---

## 5. Phase 8 — PWA, accessibility and low-bandwidth experience

- Make the site installable as a Progressive Web App where browser support permits.
- Add app manifest, icons, service-worker strategy and safe update behaviour.
- Cache only appropriate public/static assets and explicitly selected learning material.
- Consider offline access for selected notes and previously opened content; do not promise offline test submission until conflict-safe sync is designed and tested.
- Optimize images, scripts, fonts and database requests for slower networks.
- Add loading, empty, error, retry and offline states.
- Improve semantic headings, labels, keyboard navigation, focus indicators, contrast and screen-reader support.
- Respect reduced-motion settings and readable text sizing.
- Test on low-end Android devices and current major mobile browsers.

### Phase 8 exit criteria
- Installability and update flow work on supported browsers.
- Core pages remain usable under throttled network conditions.
- Cached content is clearly distinguished from live content.
- No student response is silently lost due to offline behaviour.
- Accessibility and mobile checks are documented.

---

## 6. Phase 9 — AI Learning Assistant

### Student capabilities
- Explain a question in simple SSC-oriented language in Hindi or English.
- Explain why the correct option is right and why distractors are wrong.
- Generate additional practice questions on a selected topic, clearly labelled as AI-generated practice—not PYQs.
- Suggest revision topics based on actual attempt history and syllabus progress.
- Offer hints or step-by-step explanations without revealing answers prematurely when the student chooses hint mode.

### Safety, quality and privacy
- Ground recommendations in the platform's approved syllabus and question metadata where available.
- Never fabricate an official PYQ source, exam year, notification or syllabus citation.
- Label AI-generated content and allow users to report errors.
- Do not expose one student's personal performance or profile to another student.
- Minimize personal data sent to AI services; do not send unnecessary identifiers.
- Provide a fallback when AI is unavailable.
- Keep essential learning and tests free; do not introduce a paywall for core functionality.

### Phase 9 exit criteria
- Hindi and English explanations are tested for clarity and correctness.
- Generated practice content is labelled and reviewable.
- AI recommendations use permitted student data only.
- Error reporting, rate limits and graceful failure are in place.

---

## 7. Phase 10 — Quality assurance and launch readiness

### Functional and regression QA
- Test signup/login, password reset, student profile and role-based access.
- Test admin routes as admin, authenticated non-admin and anonymous visitor.
- Test syllabus selection/progress, question management, import, bookmarks and reports.
- Test all test lifecycle paths: start, save, refresh, resume, timeout, submit, review and retake.
- Regression-test legacy lectures, questions, tests, attempts and responses.

### Security and data protection
- Review every table's RLS policies and grants.
- Confirm students can access only their own profile, bookmarks, reports and attempts where applicable.
- Confirm unpublished questions and admin tools are not exposed to students.
- Review input validation, file uploads, rate limits, secrets and error messages.
- Check that no service-role key or secret is exposed to client code.
- Verify backups and document recovery steps before launch.

### Performance and content QA
- Check mobile responsiveness, page weight, query performance and slow-network behaviour.
- Verify question answers, explanations, language quality, topic mapping and PYQ provenance.
- Check duplicate questions and translation alignment.
- Review empty states and error handling.
- Run accessibility checks and cross-browser testing.

### Release process
- Use a preview deployment for each milestone.
- Record test evidence and known limitations.
- Obtain explicit user approval before merging to `main` or deploying production.
- After approval, use a staged release and monitor errors, performance and user reports.
- Keep a rollback plan and a backup/recovery checklist.

### Phase 10 exit criteria
- Critical functional, security, regression and mobile tests pass.
- No known critical data-loss or access-control issue remains.
- Content provenance and bilingual correctness are reviewed.
- Backup and rollback procedures are documented.
- Production release is performed only after explicit approval.

---

## 8. Cross-phase delivery order and dependencies

1. Complete Phase 6 admin manager and publication validation.
2. Complete Phase 6 student question bank, bookmarks, reports and import.
3. Design and implement the additive question-bank-to-test integration without breaking legacy test tables or RPCs.
4. Implement the per-question language switch and pass Section 2.4 acceptance tests.
5. Complete Phase 7 test authoring, test taking, review and analytics.
6. Deliver Phase 8 PWA, accessibility and low-bandwidth improvements.
7. Deliver Phase 9 AI assistant after question content and analytics are sufficiently reliable.
8. Complete Phase 10 security, regression, content and release checks.

The sequence may be adjusted if a dependency or QA finding requires it, but data safety and legacy compatibility take priority over speed.

## 9. Explicitly out of scope unless separately approved

- Paid tiers, paywalls or restricting essential tests.
- Licensed third-party question-bank ingestion.
- Full-length mock tests in the initial sectional test-centre release.
- Unverified question dumps or automatically scraped copyrighted content.
- Production deployment, merge to `main` or destructive schema/data changes without explicit approval.
- Claims of official affiliation, endorsement or guaranteed exam outcomes.

## 10. Current implementation snapshot

- Phase 5 SSC Exam Centre: student and admin interfaces reported working smoothly by the user; syllabus content remains unpublished until verified.
- Phase 6 database foundation: applied and verified. Tables support logical question entries, Hindi/English translations, tags, bookmarks and reports.
- Phase 6 admin/student interfaces and bulk import: pending.
- Per-question language switching: approved in this draft; not yet implemented.
- Phases 7–10: planning scope only; not yet implemented.

**Definition of done:** A phase is complete only when its implementation is committed to the development branch, its preview deployment is checked, the relevant acceptance tests pass, and its status is accurately recorded. A database migration or a written plan alone does not make a user-facing phase complete.
