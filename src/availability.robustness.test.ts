import { describe, it, expect, beforeEach } from "vitest";
import { checkAvailability } from "./availability";
import type { Room, Interval } from "./types";

const CURRENT_TIME = 540;

const DEFAULT_BOOKING: Interval = {
  start: 600,
  end: 660,
  bookedBy: "Dr. Chen",
};

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

function cloneRoom(r: Room): Room {
  return { ...r, bookings: r.bookings.map((b) => ({ ...b })) };
}

describe("checkAvailability robustness", () => {
  let room: Room;

  beforeEach(() => {
    room = makeRoom();
  });

  it("R01: NaN start and end is unavailable", () => {
    const decision = checkAvailability(room, { start: NaN, end: NaN, bookedBy: "X" }, CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain("Times must be whole minutes (HH:MM).");
    }
  });

  it("R02: NaN start is unavailable", () => {
    const decision = checkAvailability(room, { start: NaN, end: 660, bookedBy: "X" }, CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
  });

  it("R03: NaN end is unavailable", () => {
    const decision = checkAvailability(room, { start: 600, end: NaN, bookedBy: "X" }, CURRENT_TIME);
    expect(decision.status).toBe("unavailable");
  });

  it("R04: fractional minutes (600.5–660.5) are unavailable", () => {
    const decision = checkAvailability(
      room,
      { start: 600.5, end: 660.5, bookedBy: "X" },
      CURRENT_TIME,
    );
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reasons).toContain("Times must be whole minutes (HH:MM).");
    }
  });

  it("R05: Infinity end is unavailable", () => {
    const decision = checkAvailability(
      room,
      { start: 600, end: Infinity, bookedBy: "X" },
      CURRENT_TIME,
    );
    expect(decision.status).toBe("unavailable");
  });

  it("R06: room object is not mutated after a robustness check", () => {
    const snapshot = cloneRoom(room);
    checkAvailability(room, { start: NaN, end: NaN, bookedBy: "X" }, CURRENT_TIME);
    expect(room).toEqual(snapshot);
    expect(room.bookings.length).toBe(1);
    expect(room.bookings[0]).toEqual(DEFAULT_BOOKING);
  });
});
