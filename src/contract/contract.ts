/**
 * Practice #13 — common contract shared by the code-based and low-code
 * implementations of the Smart Campus Room Availability Checker.
 *
 * Layers (kept separate on purpose):
 *   1. validateContractInput()  — input validation only (AC1, AC2, AC6)
 *   2. evaluateContract()       — availability calculation (AC3, AC4), reuses
 *                                 the existing rule engine checkAvailability()
 *   3. UI (App.tsx)             — only displays the ContractOutput (AC5)
 *
 * All functions are pure: bookings are never mutated (AC5 / T8).
 */
import { checkAvailability, intervalsOverlap, MAX_BOOKING_MINUTES } from "../availability";
import { minutesToTimeString, timeStringToMinutes, MINUTES_PER_DAY } from "../timeUtils";
import type { Interval, Room } from "../types";

export type ReasonCode =
  | "AVAILABLE"
  | "INVALID_START" // start is empty / not HH:MM
  | "START_IN_PAST" // AC1
  | "INVALID_DURATION" // AC2: empty, not a whole number, or <= 0
  | "DURATION_TOO_LONG" // AC2: > 120 minutes
  | "OUTSIDE_DAY" // interval would end after 24:00
  | "ROOM_BLOCKED" // AC4
  | "OVERLAP"; // AC3

export interface ContractInput {
  /** Requested start time, "HH:MM". */
  startTime: string;
  /** Requested duration in minutes (string from a form field or a number). */
  duration: string | number;
  /** Room status flag. */
  blocked: boolean;
  /** Fictional existing bookings (read-only). */
  bookings: readonly Interval[];
  /** Simulated "now" in minutes from midnight. */
  currentTime: number;
}

export interface ContractOutput {
  available: boolean;
  reasonCode: ReasonCode;
  message: string;
}

export type ValidationResult =
  | { ok: true; interval: Interval }
  | { ok: false; output: ContractOutput };

const fail = (reasonCode: ReasonCode, message: string): ValidationResult => ({
  ok: false,
  output: { available: false, reasonCode, message },
});

/** Layer 1 — validation only. Returns a parsed interval or a validation error. */
export function validateContractInput(input: ContractInput): ValidationResult {
  const start = timeStringToMinutes(String(input.startTime ?? "").trim());
  if (start === null) {
    return fail("INVALID_START", "Please enter a start time in HH:MM format.");
  }

  const rawDuration = String(input.duration ?? "").trim();
  if (rawDuration === "" || !/^-?\d+$/.test(rawDuration)) {
    return fail("INVALID_DURATION", "Duration must be a whole number of minutes.");
  }
  const duration = Number(rawDuration);
  if (duration <= 0) {
    return fail("INVALID_DURATION", "Duration must be greater than 0 minutes.");
  }
  if (duration > MAX_BOOKING_MINUTES) {
    return fail(
      "DURATION_TOO_LONG",
      `Duration cannot be longer than ${MAX_BOOKING_MINUTES} minutes.`,
    );
  }

  if (start <= input.currentTime) {
    return fail(
      "START_IN_PAST",
      `Start time must be in the future (now is ${minutesToTimeString(input.currentTime)}).`,
    );
  }
  if (start + duration > MINUTES_PER_DAY) {
    return fail("OUTSIDE_DAY", "The booking must end by 24:00.");
  }

  return { ok: true, interval: { start, end: start + duration, bookedBy: "Check (preview only)" } };
}

/** Layer 2 — availability calculation. Never mutates input.bookings. */
export function evaluateContract(input: ContractInput): ContractOutput {
  const v = validateContractInput(input);
  if (!v.ok) return v.output;

  const { interval } = v;
  const slot = `${minutesToTimeString(interval.start)}–${minutesToTimeString(interval.end)}`;

  // Single source of truth for the decision: the existing rule engine.
  const room: Room = {
    id: "contract",
    name: "contract",
    building: "",
    capacity: 0,
    blocked: input.blocked,
    bookings: [...input.bookings],
  };
  const decision = checkAvailability(room, interval, input.currentTime);

  if (decision.status === "available") {
    return { available: true, reasonCode: "AVAILABLE", message: `Available: the room is free ${slot}.` };
  }
  if (input.blocked) {
    return {
      available: false,
      reasonCode: "ROOM_BLOCKED",
      message: "Unavailable: the room is blocked and cannot be booked.",
    };
  }
  const conflict = input.bookings.find((b) => intervalsOverlap(interval, b));
  if (conflict) {
    return {
      available: false,
      reasonCode: "OVERLAP",
      message: `Unavailable: ${slot} overlaps an existing booking ${minutesToTimeString(conflict.start)}–${minutesToTimeString(conflict.end)}.`,
    };
  }
  // Defensive: the rule engine rejected for a reason the validator did not catch.
  return { available: false, reasonCode: "INVALID_START", message: decision.reasons.join(" ") };
}
