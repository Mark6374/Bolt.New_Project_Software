import { describe, it, expect, beforeEach } from "vitest";
import { checkAvailability } from "./availability";
import type { Room, Interval, AvailabilityDecision } from "./types";

// ─── Fixed constants ──────────────────────────────────────────────
// Default current time: 09:00 → 540 minutes from midnight
const CURRENT_TIME = 540;

// Default existing booking: 10:00–11:00 → 600–660 minutes
const DEFAULT_BOOKING: Interval = {
  start: 600,
  end: 660,
  bookedBy: "Dr. Chen",
};

// Exact reason string produced by checkAvailability for an overlap with
// DEFAULT_BOOKING. Asserting this full string (rather than just a prefix)
// detects bugs where the function reports wrong booking details.
const OVERLAP_REASON = "Overlaps an existing booking by Dr. Chen from 10:00 to 11:00.";

// ─── Fixture factory ──────────────────────────────────────────────
// Returns a fresh room each call so tests never share mutable state.
function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: "T-ROOM",
    name: "Test Room",
    building: "Test Building",
    capacity: 50,
    blocked: false,
    bookings: [DEFAULT_BOOKING],
    ...overrides,
  };
}

function candidate(start: number, end: number): Interval {
  return { start, end, bookedBy: "Test Candidate" };
}

// Deep-clone a room so the snapshot is insulated from any in-place mutation.
function cloneRoom(r: Room): Room {
  return {
    ...r,
    bookings: r.bookings.map((b) => ({ ...b })),
  };
}

// ─── AC mapping ───────────────────────────────────────────────────
// AC1: Valid interval — 0 ≤ start < end ≤ 1440 and start > current time
// AC2: Booking duration ≤ 120 minutes
// AC3: Room must not be blocked
// AC4: No overlap with existing bookings (touching endpoints OK)
// AC5: checkAvailability is pure — room and booking data unchanged after call
// AC6: Responsive desktop/mobile layout and understandable validation
//      feedback in the UI. This is a presentation-layer requirement and is
//      NOT verifiable by unit tests against checkAvailability. It is out of
//      scope for this test suite.

describe("checkAvailability", () => {
  let room: Room;

  beforeEach(() => {
    room = makeRoom();
  });

  // ─── T01: Touching end of existing booking → Available (AC4) ───
  it("T01: 11:00–12:00 is available (touches existing booking end, AC4)", () => {
    const decision = checkAvailability(room, candidate(660, 720), CURRENT_TIME);
    expect(decision).toEqual<AvailabilityDecision>({ status: "available" });
  });

  // ─── T02: Start equals current time → Unavailable (AC1) ────────
  it("T02: 09:00–09:30 is unavailable because start equals current time (AC1)", () => {
    const decision = checkAvailability(room, candidate(540, 570), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain(
        "Start time must be after the current time.",
      );
    }
  });

  // ─── T03: Start equals end → Unavailable (AC1) ────────────────
  it("T03: 12:00–12:00 is unavailable because start equals end (AC1)", () => {
    const decision = checkAvailability(room, candidate(720, 720), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain(
        "Start time must be earlier than end time.",
      );
    }
  });

  // ─── T04: Start after end → Unavailable (AC1) ─────────────────
  it("T04: 12:30–12:00 is unavailable because start is after end (AC1)", () => {
    const decision = checkAvailability(room, candidate(750, 720), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain(
        "Start time must be earlier than end time.",
      );
    }
  });

  // ─── T05: End exceeds 24:00 → Unavailable (AC1) ───────────────
  it("T05: 23:00–24:01 is unavailable because end exceeds 24:00 (AC1)", () => {
    const decision = checkAvailability(
      room,
      candidate(1380, 1441),
      CURRENT_TIME,
    );
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain(
        "Times must be between 00:00 and 24:00.",
      );
    }
  });

  // ─── T06: Exactly 120 minutes → Available (AC2) ───────────────
  it("T06: 12:00–14:00 is available (exactly 120 min, AC2)", () => {
    const decision = checkAvailability(room, candidate(720, 840), CURRENT_TIME);
    expect(decision).toEqual<AvailabilityDecision>({ status: "available" });
  });

  // ─── T07: 121 minutes → Unavailable (AC2) ─────────────────────
  it("T07: 12:00–14:01 is unavailable because duration exceeds 120 min (AC2)", () => {
    const decision = checkAvailability(room, candidate(720, 841), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain(
        "Booking cannot be longer than 120 minutes.",
      );
    }
  });

  // ─── T08: Touching start of existing booking → Available (AC4) ─
  it("T08: 09:30–10:00 is available (touches existing booking start, AC4)", () => {
    const decision = checkAvailability(room, candidate(570, 600), CURRENT_TIME);
    expect(decision).toEqual<AvailabilityDecision>({ status: "available" });
  });

  // ─── T09: Partial overlap → Unavailable (AC4) ─────────────────
  // Asserting the exact reason string ensures the function reports the
  // correct booking owner and time range, not just any overlap message.
  it("T09: 10:30–11:30 is unavailable because it overlaps existing booking (AC4)", () => {
    const decision = checkAvailability(room, candidate(630, 690), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toEqual([OVERLAP_REASON]);
    }
  });

  // ─── T10: Envelops existing booking → Unavailable (AC4) ───────
  it("T10: 09:30–11:30 is unavailable because it overlaps existing booking (AC4)", () => {
    const decision = checkAvailability(room, candidate(570, 690), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toEqual([OVERLAP_REASON]);
    }
  });

  // ─── T11: Fully inside existing booking → Unavailable (AC4) ───
  it("T11: 10:15–10:45 is unavailable because it is inside existing booking (AC4)", () => {
    const decision = checkAvailability(room, candidate(615, 645), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toEqual([OVERLAP_REASON]);
    }
  });

  // ─── T12: Identical to existing booking → Unavailable (AC4) ───
  it("T12: 10:00–11:00 is unavailable because it matches existing booking exactly (AC4)", () => {
    const decision = checkAvailability(room, candidate(600, 660), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toEqual([OVERLAP_REASON]);
    }
  });

  // ─── T13: Blocked room → Unavailable (AC3) ────────────────────
  it("T13: 11:00–12:00 with blocked room is unavailable (AC3)", () => {
    const blockedRoom = makeRoom({ blocked: true });
    const decision = checkAvailability(
      blockedRoom,
      candidate(660, 720),
      CURRENT_TIME,
    );
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain(
        "This room is currently blocked and cannot be booked.",
      );
    }
  });

  // ─── T14: No existing bookings → Available (AC4) ──────────────
  it("T14: 10:30–11:30 with no existing bookings is available (AC4)", () => {
    const emptyRoom = makeRoom({ bookings: [] });
    const decision = checkAvailability(
      emptyRoom,
      candidate(630, 690),
      CURRENT_TIME,
    );
    expect(decision).toEqual<AvailabilityDecision>({ status: "available" });
  });

  // ─── T15: Purity — entire room unchanged after check (AC5) ────
  // Snapshots the full room object (not just bookings) and compares after
  // the call. Detects any mutation to room fields, booking array length,
  // or individual booking properties.
  it("T15: entire room object remains unchanged after a check (AC5)", () => {
    const snapshot = cloneRoom(room);

    checkAvailability(room, candidate(630, 690), CURRENT_TIME);

    expect(room).toEqual(snapshot);
    expect(room.bookings.length).toBe(1);
    expect(room.bookings[0]).toEqual(DEFAULT_BOOKING);
    expect(room.blocked).toBe(false);
    expect(room.capacity).toBe(50);
    expect(room.id).toBe("T-ROOM");
    expect(room.name).toBe("Test Room");
    expect(room.building).toBe("Test Building");
  });

  // ─── T16: Start in the past → Unavailable (AC1) ───────────────
  it("T16: 08:30–09:30 is unavailable because start is in the past (AC1)", () => {
    const decision = checkAvailability(room, candidate(510, 570), CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain(
        "Start time must be after the current time.",
      );
    }
  });

  // ─── T17: Valid one-minute booking → Available (AC1, AC2) ─────
  it("T17: 11:00–11:01 is available for a valid one-minute booking (AC1, AC2)", () => {
    const decision = checkAvailability(room, candidate(660, 661), CURRENT_TIME);
    expect(decision).toEqual<AvailabilityDecision>({ status: "available" });
  });
});
