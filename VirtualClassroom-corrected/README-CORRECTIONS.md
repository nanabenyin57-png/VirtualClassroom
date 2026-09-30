# K_Tawiah Virtual Classroom — corrected package

This is your project with the defects found in review fixed.
Nothing has been pushed to your GitHub repo; this is a local copy.

## What was fixed

Frontend
- `js/config.js` (new) centralises the API host. All 20 hardcoded
  `http://127.0.0.1:5000` URLs across `app.js`, `student.js`, `teacher.js`,
  `admin.js` now go through `apiUrl()`. The site no longer breaks the moment
  the backend is not on the same machine as the browser.
- `index.html`: the Sign Up fields were sitting OUTSIDE `<form
  id="registrationform">`, so Sign Up submitted nothing. All fields are now
  inside the form; the stray `</section>` and the placeholder comment that
  closed the form are gone.
- `index.html`: broken logo path (`../html/images/...` -> `images/...`) and
  literal `[cite: 2, 3, 4]` artefacts removed.

Backend (`html/backend/server.js`)
- The AI assistant called model `gemini-3.8-flash`, which does not exist, so
  every prompt returned 404. Now `gemini-2.5-flash`.
- The Gemini function-call round trip rebuilt the model's turn without its
  `thoughtSignature`; Gemini rejects that, so every question that triggered
  the database tool failed. The model turn is now replayed verbatim, and
  every `functionCall` is answered instead of only the first.
- `POST /api/addnotes` was missing entirely, so the admin "Add Note" button
  always failed. Added, admin-gated, with input validation.
- `/api/database-search` rejected `table=all`, which was the default option
  in the student search dropdown.
- The `course_preview` search allowlist referenced a `title` column that does
  not exist on that table.
- Profile image uploads stored an absolute `http://127.0.0.1:5000/...` URL in
  the database. Now stores `/uploads/<filename>`.
- The `StudentQuestions` INSERT listed 5 columns but supplied 6 values.

## How to run

Backend (needs your SQL Server reachable):
    cd html/backend
    npm install
    node server.js
It listens on http://127.0.0.1:5000

Frontend:
    cd html
    python3 -m http.server 8080
Then open http://127.0.0.1:8080/index.html

`js/config.js` already defaults to `http://127.0.0.1:5000` when the page is
served from localhost — no change needed for local development.

## Verified

- All five JS files pass `node --check`.
- `tests/components.mjs` — 34/35 checks across index/student/teacher/admin:
  each page is loaded into a DOM with its real scripts executed in order and
  the API stubbed. Confirms form structure, that `config.js` defines
  `API_BASE` before page scripts run, that all 20 URLs build correctly, and
  that no page throws on load.
- Asset paths (html/js/css/images) all return 200 from a static server.

Not verified: no real browser rendering (layout/CSS), and no live database,
so not a true end-to-end run.

## SECURITY — read this

`html/backend/.env` contains your `sa` password, your JWT secret and your
Gemini API key. That file was in the zip you uploaded and the repo is public.
Rotate all three. It is included here only because you need it to run locally.

## Still open

- `server.js` starts the API only after a successful database connection and
  calls `process.exit(1)` otherwise. If SQL Server is down the whole frontend
  fails rather than showing a clean error.
- `student.html` / `teacher.html` still link to `signin.html` and
  `signup.html`, which were deleted from the repo — those links are live 404s.
- `admin.html` parses the JWT without guarding against a missing token.
