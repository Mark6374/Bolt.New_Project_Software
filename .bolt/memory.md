# Project memory

## Product intent & audience

- Smart Campus room availability checker: users pick a room, date, and time window and see whether it's available, with overlap reasons and a visual timeline.
- Pure front-end prototype; all data is fictional and in-memory. No authentication, backend, database, or persisted bookings.
- Governed by `AGENTS.md` acceptance criteria AC1–AC6 that must be preserved exactly.

## Brand personality & voice

- Utility/education-oriented; clear validation feedback and readable result reasoning over polish.
- Reason text exposes booking metadata (e.g. owner names) directly to users — functional, not marketing-toned.

## Visual design & UX direction

- Vite + React + TypeScript + Tailwind CSS + Lucide React icons; `@/` alias maps to `src/`.
- Core UI: `App.tsx` form (room select, date, start/end time inputs) + result panel; `Timeline.tsx` renders proportional horizontal bars via percentage widths.
- Responsive layout expected; time inputs are native `<input type="time">` (max 23:59, so 24:00/1440 only reachable via API/test).
- No error boundary or recovery UI; render-time throws blank the page.

## Decisions, constraints & rationale

- Stack fixed by template: JSX + Tailwind + React hooks + Lucide; avoid adding UI/icon/theme packages unless explicitly requested.
- AGENTS.md constraints: no backend/login/database/persisted bookings; don't change `availability.test.ts` outcomes; prefer pure functions; ≤2 refactors with no Strategy/Adapter/Singleton/Factory; don't mutate `SAMPLE_ROOMS`; keep responsive UI and validation feedback; after changes run `npm test` + `npm run build` and report changed files, rationale, and actual command output.
- `availability.ts` is the core pure logic module; `timeUtils.ts` holds time↔minutes conversions; `roomData.ts` ships `SAMPLE_ROOMS` fixture (4 rooms).
- `@supabase/supabase-js` is listed in `package.json` but never imported — contradicts no-backend constraint; treat as a trap, do not wire up persistence.
- `npm run build` is plain `vite build` (no `tsc --noEmit`); separate `typecheck` and `lint` scripts exist but are not part of the mandated gate.

## Open questions & assumptions

- Whether a live clock/auto-refresh should be added for AC1 "start after current time" (currently `nowInMinutes()` is captured once on mount and only refreshed manually).
- Whether `minutesToTimeString` should bounds-check to prevent garbled labels / negative-width timeline bars for invalid or inverted intervals.
- Whether `bookedBy` owner names should be redacted if real data is ever wired in (privacy concern, currently fictional).
- Whether to add an error boundary and guard non-null assertions (`rooms[0].id`, `rooms.find(...)!`) against empty room lists.
- Whether to fold `tsc --noEmit`/`lint` into `build` or a `verify` script so the AGENTS.md gate catches type errors.