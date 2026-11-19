# Smart Campus Room Availability Checker

Client-only React + TypeScript + Vite demo with fictional in-memory data (no login, no database, no backend).

## Commands

```bash
npm ci
npm run dev        # local dev server
npm test           # vitest: booking rules + explanation feature
npm run typecheck
npm run lint
npm run build
```

## Structure

- `src/availability.ts` — deterministic booking rules (AC1–AC6). Source of truth.
- `src/explain/contract.ts` — explain request contract, reason codes, input validation.
- `src/explain/prompt.ts` — system prompt (3 variants) and prompt builder.
- `src/explain/adapters.ts` — `ExplanationAdapter` port + **mock** adapter with demo failure modes.
- `src/explain/service.ts` — timeout, output validation, deterministic fallback.
- `src/components/ExplainPanel.tsx` — "Explain availability" UI, visually separate from the confirmed result.

## Explain availability flow

```
student input → validation → checkAvailability() → structured result (authoritative)
             → buildExplainRequest (minimal facts) → validateExplainRequest
             → adapter (mock; real one would be server-side) with timeout
             → validateExplanation → UI (labelled "AI-generated")
                                  ↘ on any failure: deterministic fallback
```

The mock adapter makes no network calls. To use a real model, implement `ExplanationAdapter` as a call to your own server endpoint that holds the API key.
