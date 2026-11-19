/**
 * "Explain availability" — input/output contract.
 *
 * The deterministic checker (src/availability.ts) is the ONLY source of truth
 * for availability. Everything in this module is derived from its result; the
 * LLM never decides availability and never changes bookings.
 */
import type { CheckResult } from "../types";
import { intervalsOverlap } from "../availability";
import { minutesToTimeString } from "../timeUtils";

export type ReasonCode =
  | "AVAILABLE"
  | "INVALID_TIME"
  | "PAST_TIME"
  | "TOO_LONG"
  | "ROOM_BLOCKED"
  | "OVERLAP"
  | "UNKNOWN";

export const REASON_CODES: readonly ReasonCode[] = [
  "AVAILABLE",
  "INVALID_TIME",
  "PAST_TIME",
  "TOO_LONG",
  "ROOM_BLOCKED",
  "OVERLAP",
  "UNKNOWN",
];

export const MAX_ROOM_LABEL = 60;
export const MAX_QUESTION = 200;
export const MAX_EXPLANATION = 320;
export const MAX_CONFLICTS = 10;

/** Minimal, non-personal context sent to the explanation adapter. */
export interface ExplainRequest {
  roomLabel: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM" (may be "24:00")
  isAvailable: boolean;
  reasonCodes: ReasonCode[];
  /** Time ranges of overlapping bookings, e.g. "09:00-10:00". No names. */
  conflictTimes: string[];
  /** Optional student question. Untrusted data — never instructions. */
  question: string;
}

/** Shape the adapter must return. Validated before it reaches the UI. */
export interface ExplainResponse {
  explanation: string;
}

const MESSAGE_TO_CODE: ReadonlyArray<[RegExp, ReasonCode]> = [
  [/^Times must be whole minutes/, "INVALID_TIME"],
  [/^Times must be between/, "INVALID_TIME"],
  [/^Start time must be earlier than end time/, "INVALID_TIME"],
  [/^Start time must be after the current time/, "PAST_TIME"],
  [/^Booking cannot be longer than/, "TOO_LONG"],
  [/^This room is currently blocked/, "ROOM_BLOCKED"],
  [/^Overlaps an existing booking/, "OVERLAP"],
];

/** Map one deterministic reason message to a stable reason code. */
export function toReasonCode(message: string): ReasonCode {
  for (const [pattern, code] of MESSAGE_TO_CODE) {
    if (pattern.test(message)) return code;
  }
  return "UNKNOWN";
}

/** Build the explain request from the deterministic check result (pure). */
export function buildExplainRequest(
  result: CheckResult,
  question = "",
): ExplainRequest {
  const { room, interval, decision } = result;
  const isAvailable = decision.status === "available";

  const reasonCodes: ReasonCode[] = isAvailable
    ? ["AVAILABLE"]
    : Array.from(new Set(decision.reasons.map(toReasonCode)));

  const conflictTimes = room.bookings
    .filter((b) => intervalsOverlap(interval, b))
    .map((b) => `${minutesToTimeString(b.start)}-${minutesToTimeString(b.end)}`);

  return {
    roomLabel: room.name,
    start: minutesToTimeString(interval.start),
    end: minutesToTimeString(interval.end),
    isAvailable,
    reasonCodes,
    conflictTimes: isAvailable ? [] : conflictTimes,
    question,
  };
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

const ROOM_LABEL_RE = /^[\p{L}\p{N} .,'()&/-]+$/u;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const RANGE_RE = /^([01]\d|2[0-3]):[0-5]\d-(([01]\d|2[0-3]):[0-5]\d|24:00)$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** AC3: reject empty, malformed or overly long input before any adapter call. */
export function validateExplainRequest(input: unknown): Validation<ExplainRequest> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Request is missing." };
  }
  const r = input as Record<string, unknown>;

  if (typeof r.roomLabel !== "string" || r.roomLabel.trim() === "") {
    return { ok: false, error: "Room label is empty." };
  }
  const roomLabel = r.roomLabel.trim();
  if (roomLabel.length > MAX_ROOM_LABEL) {
    return { ok: false, error: `Room label is longer than ${MAX_ROOM_LABEL} characters.` };
  }
  if (!ROOM_LABEL_RE.test(roomLabel)) {
    return { ok: false, error: "Room label contains unsupported characters." };
  }

  if (typeof r.start !== "string" || typeof r.end !== "string" || r.start === "" || r.end === "") {
    return { ok: false, error: "Start and end time are required." };
  }
  if (!TIME_RE.test(r.start) || !TIME_RE.test(r.end)) {
    return { ok: false, error: "Times must use the HH:MM format." };
  }

  if (typeof r.isAvailable !== "boolean") {
    return { ok: false, error: "Availability status is missing." };
  }

  if (
    !Array.isArray(r.reasonCodes) ||
    r.reasonCodes.length === 0 ||
    r.reasonCodes.length > REASON_CODES.length ||
    !r.reasonCodes.every((c) => REASON_CODES.includes(c as ReasonCode))
  ) {
    return { ok: false, error: "Reason codes are missing or unknown." };
  }
  const reasonCodes = r.reasonCodes as ReasonCode[];
  const saysAvailable = reasonCodes.length === 1 && reasonCodes[0] === "AVAILABLE";
  if (saysAvailable !== r.isAvailable) {
    return { ok: false, error: "Reason codes do not match the availability status." };
  }

  if (
    !Array.isArray(r.conflictTimes) ||
    r.conflictTimes.length > MAX_CONFLICTS ||
    !r.conflictTimes.every((t) => typeof t === "string" && RANGE_RE.test(t))
  ) {
    return { ok: false, error: "Conflict times are malformed." };
  }

  const rawQuestion = r.question ?? "";
  if (typeof rawQuestion !== "string") {
    return { ok: false, error: "Question must be text." };
  }
  const question = rawQuestion.trim();
  if (question.length > MAX_QUESTION) {
    return { ok: false, error: `Question is longer than ${MAX_QUESTION} characters.` };
  }
  if (CONTROL_RE.test(question)) {
    return { ok: false, error: "Question contains control characters." };
  }

  return {
    ok: true,
    value: {
      roomLabel,
      start: r.start,
      end: r.end,
      isAvailable: r.isAvailable,
      reasonCodes: [...reasonCodes],
      conflictTimes: [...(r.conflictTimes as string[])],
      question,
    },
  };
}
