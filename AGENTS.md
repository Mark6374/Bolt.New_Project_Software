## Project

Smart Campus room availability checker; one room selectable among SAMPLE_ROOMS, fictional in-memory data only.

## Constraints

Preserve AC1 through AC6 exactly. No backend, login, database, or persisted booking creation. Do not change src/availability.test.ts expected outcomes.

## Engineering rules

Prefer pure functions and the smallest change that fixes a real cohesion problem. Use at most two justified refactors; do not introduce Strategy, Adapter, Singleton, or Factory unless a concrete multi-policy or multi-shape need exists. Do not mutate booking fixtures (SAMPLE_ROOMS). Keep the existing responsive desktop/mobile UI and validation feedback.

## Verification

Run npm test and npm run build after any change. Report changed files, a short rationale per change, and the test command output. Do not claim a behavior is preserved without showing the test/build evidence.

## Explain availability feature (Practice #11)

- `checkAvailability` is the only source of truth. The explanation feature reads its result and must never decide availability or modify bookings.
- Explanation adapters live in `src/explain/`. Only the clearly labelled mock adapter runs in the browser; a real LLM adapter must run server-side and API keys must never appear in client code or the repo.
- Send minimal context only: room label, requested times, isAvailable, reason codes, conflicting time ranges. No `bookedBy` names or other personal data.
- Validate input (empty / malformed / too long → rejected) and validate model output (≤2 sentences, ≤320 chars, no markup, agrees with status, no invented times). On timeout, error, missing key or invalid output show the deterministic fallback.
- Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` after any change.
