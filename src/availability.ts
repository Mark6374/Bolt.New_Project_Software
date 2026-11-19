import type {
  AvailabilityDecision,
  Interval,
  Room,
} from "./types";
import { fmt, MINUTES_PER_DAY } from "./timeUtils";

export const MAX_BOOKING_MINUTES = 120;

/** AC4: overlap check — touching endpoints are allowed. */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Runs all acceptance-criteria checks and returns an Available / Unavailable
 * decision. This function is pure: it never mutates the room or its bookings.
 */
export function checkAvailability(
  room: Room,
  candidate: Interval,
  currentTime: number,
): AvailabilityDecision {
  if (
    !Number.isInteger(candidate.start) ||
    !Number.isInteger(candidate.end) ||
    !Number.isInteger(currentTime)
  ) {
    return { status: "unavailable", reasons: ["Times must be whole minutes (HH:MM)."] };
  }

  const reasons: string[] = [];

  // AC1: valid interval — 0 ≤ start < end ≤ 1440 and start after current time
  if (candidate.start < 0 || candidate.end > MINUTES_PER_DAY) {
    reasons.push("Times must be between 00:00 and 24:00.");
  }
  if (candidate.start >= candidate.end) {
    reasons.push("Start time must be earlier than end time.");
  }
  if (candidate.start <= currentTime) {
    reasons.push("Start time must be after the current time.");
  }

  // AC2: reject bookings longer than 120 minutes
  if (candidate.end - candidate.start > MAX_BOOKING_MINUTES) {
    reasons.push("Booking cannot be longer than 120 minutes.");
  }

  // AC3: reject when the room is blocked
  if (room.blocked) {
    reasons.push("This room is currently blocked and cannot be booked.");
  }

  // AC4: reject intervals that overlap an existing booking
  for (const booking of room.bookings) {
    if (intervalsOverlap(candidate, booking)) {
      reasons.push(
        `Overlaps an existing booking by ${booking.bookedBy} from ${fmt(booking.start)} to ${fmt(booking.end)}.`,
      );
    }
  }

  return reasons.length === 0
    ? { status: "available" }
    : { status: "unavailable", reasons };
}
