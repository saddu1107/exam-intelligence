# Exam Intelligence — Starter

A Next.js starter for a lecture-based competitive exam platform.

## Product rules
- Lecture-first learning: video + notes + a test based on that lecture.
- Admin chooses 30 or 50 questions.
- 20 seconds per question.
- SSC-style negative marking is configurable per test.
- Results include score, correct/wrong/unanswered and wrong-question review.
- Separate lecture-wise and subject-wise leaderboards.
- No full-length mock tests in the initial release.
- Free student access initially.

## Run locally
1. Install Node.js (LTS).
2. Extract this project.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Add Supabase project URL and anon key when the backend is configured.
6. Run `npm run dev` and open `http://localhost:3000`.

## Current status
This is the first frontend scaffold and database schema draft. It is not yet connected to Supabase and does not yet include working authentication, admin CRUD, video/notes uploads, timed tests, or live rankings.

## Next milestones
1. Confirm/create GitHub repository.
2. Create Supabase project and apply schema.
3. Add secure role-based access and RLS policies.
4. Build admin subject/chapter/lecture/question management.
5. Build student lecture page and timed test engine.
6. Build result analysis and ranking calculations.
7. Deploy and test on mobile.
