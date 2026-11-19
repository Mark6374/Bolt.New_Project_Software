import {
  MAX_EXPLANATION,
  validateExplainRequest,
  type ExplainRequest,
  type ReasonCode,
} from "./contract";
import { MissingApiKeyError, type ExplanationAdapter } from "./adapters";
import { buildPrompt } from "./prompt";

export const DEFAULT_TIMEOUT_MS = 3000;

export type FallbackCause = "timeout" | "api-error" | "no-key" | "invalid-output";

export type ExplainOutcome =
  | { kind: "generated"; explanation: string; source: string; isMock: boolean; latencyMs: number }
  | { kind: "fallback"; explanation: string; cause: FallbackCause; latencyMs: number }
  | { kind: "rejected"; error: string };

const FALLBACK_TEXT: Record<ReasonCode, string> = {
  AVAILABLE: "the requested slot passed every booking rule",
  INVALID_TIME: "the requested times do not form a valid interval",
  PAST_TIME: "the start time is not after the current time",
  TOO_LONG: "the slot is longer than 120 minutes",
  ROOM_BLOCKED: "the room is blocked",
  OVERLAP: "the slot overlaps an existing booking",
  UNKNOWN: "a booking rule was not met",
};

/** AC4: deterministic explanation shown when the model cannot be used. */
export function deterministicFallback(req: ExplainRequest): string {
  const status = req.isAvailable ? "Available" : "Unavailable";
  const why = req.reasonCodes.map((c) => FALLBACK_TEXT[c]).join("; ");
  return `Status from the booking rules: ${status} — ${why}.`;
}

function countSentences(text: string): number {
  return text.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim() !== "").length;
}

/**
 * Validate untrusted model output (AC2). Returns the cleaned text, or null if
 * the output is malformed or disagrees with the deterministic result.
 */
export function validateExplanation(raw: unknown, req: ExplainRequest): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const text = (raw as Record<string, unknown>).explanation;
  if (typeof text !== "string") return null;

  const explanation = text.trim().replace(/\s+/g, " ");
  if (explanation === "" || explanation.length > MAX_EXPLANATION) return null;
  if (/[<>`]/.test(explanation)) return null; // no markup / code
  if (countSentences(explanation) > 2) return null;

  // Must agree with the authoritative status.
  if (req.isAvailable) {
    if (/\b(not available|unavailable|not free|cannot be booked|blocked|overlaps?)\b/i.test(explanation)) {
      return null;
    }
  } else {
    if (/\bis (free|available)\b/i.test(explanation)) return null;
    if (/\byou (can|may) (use|book|have)\b/i.test(explanation)) return null; // fix R02: positive claim
    if (!/\b(not available|unavailable|cannot|blocked|not a valid)\b/i.test(explanation)) return null;
  }

  // Fix R02: the facts never contain people, so any "title + name" is invented.
  if (/\b(Dr|Prof|Mr|Mrs|Ms|Mx)\.?\s+[A-Z]/.test(explanation)) return null;

  // No invented times: every HH:MM must come from the supplied facts.
  const allowed = new Set<string>([req.start, req.end]);
  for (const range of req.conflictTimes) range.split("-").forEach((t) => allowed.add(t));
  const mentioned = explanation.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  if (mentioned.some((t) => !allowed.has(t))) return null;

  return explanation;
}

function classify(err: unknown, timedOut: boolean): FallbackCause {
  if (timedOut) return "timeout";
  if (err instanceof MissingApiKeyError) return "no-key";
  return "api-error";
}

/**
 * Validate input → call adapter with a timeout → validate output.
 * Never throws; never changes the booking decision.
 */
export async function explainAvailability(
  input: unknown,
  adapter: ExplanationAdapter,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<ExplainOutcome> {
  const checked = validateExplainRequest(input);
  if (!checked.ok) return { kind: "rejected", error: checked.error };
  const req = checked.value;

  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Fix R01: race against our own timer so a hung adapter that ignores the
  // AbortSignal still produces a fallback instead of an endless spinner.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error(`Timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });
  const startedAt = Date.now();

  try {
    const raw = await Promise.race([adapter.explain(buildPrompt(req), req, controller.signal), timeout]);
    const latencyMs = Date.now() - startedAt;
    const explanation = validateExplanation(raw, req);
    if (explanation === null) {
      return { kind: "fallback", explanation: deterministicFallback(req), cause: "invalid-output", latencyMs };
    }
    return { kind: "generated", explanation, source: adapter.label, isMock: adapter.isMock, latencyMs };
  } catch (err) {
    return {
      kind: "fallback",
      explanation: deterministicFallback(req),
      cause: classify(err, timedOut),
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}
