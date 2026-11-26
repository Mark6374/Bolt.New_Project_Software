/**
 * Shared fictional fixture used by BOTH implementations (code-based and
 * low-code). The same values are copied into the low-code builder.
 * Room: "Lecture Hall A" (fictional). Simulated current time: 08:00.
 */
import type { Interval } from "../types";

export const SHARED_CURRENT_TIME = 8 * 60; // 08:00

export const SHARED_BOOKINGS: readonly Interval[] = Object.freeze([
  Object.freeze({ start: 9 * 60, end: 10 * 60, bookedBy: "Booking #1" }), // 09:00–10:00
  Object.freeze({ start: 13 * 60, end: 14 * 60, bookedBy: "Booking #2" }), // 13:00–14:00
]);

/** The eight common test inputs (Task #02), prepared before implementation. */
export const SHARED_CASES = [
  { id: "T1", title: "valid free interval", startTime: "10:30", duration: "60", blocked: false, expectAvailable: true, expectCode: "AVAILABLE" },
  { id: "T2", title: "overlap with existing booking", startTime: "09:30", duration: "60", blocked: false, expectAvailable: false, expectCode: "OVERLAP" },
  { id: "T3", title: "blocked room", startTime: "10:30", duration: "60", blocked: true, expectAvailable: false, expectCode: "ROOM_BLOCKED" },
  { id: "T4", title: "duration = 0", startTime: "10:30", duration: "0", blocked: false, expectAvailable: false, expectCode: "INVALID_DURATION" },
  { id: "T5", title: "duration = 121", startTime: "10:30", duration: "121", blocked: false, expectAvailable: false, expectCode: "DURATION_TOO_LONG" },
  { id: "T6", title: "past start time", startTime: "07:00", duration: "30", blocked: false, expectAvailable: false, expectCode: "START_IN_PAST" },
  { id: "T7", title: "adjacent non-overlapping interval", startTime: "10:00", duration: "60", blocked: false, expectAvailable: true, expectCode: "AVAILABLE" },
] as const;
