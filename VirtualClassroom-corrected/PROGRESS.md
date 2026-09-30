# VirtualClassroom — work log

## Status: corrections applied + frontend verified

### Fixed (committed d6e3697)
- js/config.js added — API_BASE + apiUrl()/mediaUrl(); loaded before page scripts in all 4 pages
- 20 hardcoded http://127.0.0.1:5000 URLs centralised (app 3, student 7, teacher 9, admin 1)
- index.html signup form structure repaired (inputs were orphaned outside <form>)
- broken logo path (../html/images/... -> images/...), [cite: N] artefacts removed
- server.js: course_preview allowlist column 'title' -> real columns
- server.js: upload URL now relative (/uploads/x) not absolute localhost
- server.js: StudentQuestions INSERT column/values arity fixed
- server.js: gemini-3.8-flash -> gemini-2.5-flash (model did not exist; AI was dead)
- server.js: added POST /api/addnotes (admin.js called an endpoint that did not exist)
- server.js: /api/database-search accepts table=all again

### Verified by test
- tests/components.mjs — 34/35 checks pass across all 4 pages
- all 5 JS files pass node --check
- all 20 apiUrl() call sites build well-formed absolute URLs

### Known limits of this verification
- No headless browser available in container (Chrome CDN blocked) — tests run in jsdom.
  DOM-level only: no layout, no real CSS rendering, no visual regression.
- No live database, so no true end-to-end test.

### Still open
- server.js starts the API only AFTER a successful DB connect (process.exit(1) otherwise).
  If SQL Server is down the whole frontend fails. Should listen first, connect lazily.
- dead signin.html/signup.html links in student/teacher nav (files were deleted)
- admin.html unguarded JSON.parse(atob(token.split('.')[1]))
- logout does not clear firstname
- stale ALTER TABLE in SQL file referencing a nonexistent column
- .env with sa password / JWT secret / Gemini key shipped in the uploaded zip —
  repo is PUBLIC on GitHub. Rotate all three.
