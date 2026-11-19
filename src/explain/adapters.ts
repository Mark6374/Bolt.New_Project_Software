import type { ExplainRequest, ReasonCode } from "./contract";
import type { BuiltPrompt } from "./prompt";

/**
 * Port between the app and an LLM. Two concrete shapes exist (mock now, a
 * server-side HTTP adapter later), which is why this is an interface.
 *
 * A real adapter MUST run on a server: the API key never ships to the browser.
 * This static client-only app therefore uses the clearly labelled mock.
 */
export interface ExplanationAdapter {
  readonly label: string;
  readonly isMock: boolean;
  explain(prompt: BuiltPrompt, req: ExplainRequest, signal: AbortSignal): Promise<unknown>;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("LLM API key is not configured on the server.");
    this.name = "MissingApiKeyError";
  }
}

/** Demo switches so failure handling can be shown without a paid API. */
export type MockBehaviour = "normal" | "slow" | "error" | "no-key" | "bad-output";

export const MOCK_BEHAVIOURS: ReadonlyArray<{ id: MockBehaviour; label: string }> = [
  { id: "normal", label: "Normal response" },
  { id: "slow", label: "Slow model (timeout)" },
  { id: "error", label: "API error (HTTP 503)" },
  { id: "no-key", label: "Missing API key" },
  { id: "bad-output", label: "Hallucinated output" },
];

const PRIMARY_SENTENCE: Record<Exclude<ReasonCode, "AVAILABLE">, (r: ExplainRequest) => string> = {
  OVERLAP: (r) =>
    `${r.roomLabel} is not available from ${r.start} to ${r.end} because it overlaps an existing booking` +
    (r.conflictTimes.length ? ` (${r.conflictTimes.join(", ")})` : "") +
    ".",
  ROOM_BLOCKED: (r) => `${r.roomLabel} is not available because the room is blocked and cannot be booked today.`,
  PAST_TIME: (r) =>
    `${r.roomLabel} is not available from ${r.start} to ${r.end} because that start time has already passed.`,
  TOO_LONG: (r) =>
    `${r.roomLabel} is not available from ${r.start} to ${r.end} because bookings are limited to 120 minutes.`,
  INVALID_TIME: (r) =>
    `${r.roomLabel} is not available for ${r.start} to ${r.end} because that is not a valid time interval.`,
  UNKNOWN: (r) => `${r.roomLabel} is not available from ${r.start} to ${r.end} under the booking rules.`,
};

const TIP: Record<Exclude<ReasonCode, "AVAILABLE">, string> = {
  OVERLAP: "Try a slot that starts when the existing booking ends.",
  ROOM_BLOCKED: "Please choose a different room.",
  PAST_TIME: "Pick a start time later than the current time.",
  TOO_LONG: "Try a shorter slot of two hours or less.",
  INVALID_TIME: "Make sure the start time is earlier than the end time.",
  UNKNOWN: "Check the reasons listed above.",
};

/** Deterministic template "model": explanation built only from structured facts. */
export function mockExplanation(req: ExplainRequest): string {
  if (req.isAvailable) {
    return `${req.roomLabel} is free from ${req.start} to ${req.end} because the slot passed every booking rule. This is only a check, so nothing has been booked yet.`;
  }
  const [primary, ...rest] = req.reasonCodes as Exclude<ReasonCode, "AVAILABLE">[];
  const second =
    rest.length > 0
      ? `It also breaks ${rest.length} other rule${rest.length > 1 ? "s" : ""} listed above.`
      : TIP[primary];
  return `${PRIMARY_SENTENCE[primary](req)} ${second}`;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** MOCK adapter — no network, no key. Ignores the student question's instructions by design. */
export function createMockAdapter(
  behaviour: MockBehaviour = "normal",
  { latencyMs = 350, slowMs = 10_000 }: { latencyMs?: number; slowMs?: number } = {},
): ExplanationAdapter {
  return {
    label: "Mock LLM adapter (no real AI call)",
    isMock: true,
    async explain(_prompt, req, signal) {
      if (behaviour === "no-key") throw new MissingApiKeyError();
      await wait(behaviour === "slow" ? slowMs : latencyMs, signal);
      if (behaviour === "error") throw new Error("HTTP 503 Service Unavailable");
      if (behaviour === "bad-output") {
        // Simulates a hallucinating model: contradicts the status and invents a booking.
        return {
          explanation: `Good news: ${req.roomLabel} is available all day, and Prof. Smith has a booking at 23:15. <b>Book now</b>`,
        };
      }
      return { explanation: mockExplanation(req) };
    },
  };
}
