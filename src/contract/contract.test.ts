import { describe, it, expect } from "vitest";
import { evaluateContract, validateContractInput } from "./contract";
import { SHARED_BOOKINGS, SHARED_CASES, SHARED_CURRENT_TIME } from "./sharedFixture";

const run = (c: { startTime: string; duration: string; blocked: boolean }) =>
  evaluateContract({ ...c, bookings: SHARED_BOOKINGS, currentTime: SHARED_CURRENT_TIME });

describe("Practice #13 shared contract — T1..T7", () => {
  for (const c of SHARED_CASES) {
    it(`${c.id}: ${c.title} -> ${c.expectCode}`, () => {
      const out = run(c);
      expect(out.available).toBe(c.expectAvailable);
      expect(out.reasonCode).toBe(c.expectCode);
      expect(out.message.length).toBeGreaterThan(10);
    });
  }
});

describe("T8: booking data unchanged after checks", () => {
  it("bookings are identical after running T1..T7", () => {
    const before = JSON.stringify(SHARED_BOOKINGS);
    for (const c of SHARED_CASES) run(c);
    expect(JSON.stringify(SHARED_BOOKINGS)).toBe(before);
    expect(Object.isFrozen(SHARED_BOOKINGS)).toBe(true);
  });
});

describe("AC6: understandable feedback for malformed input", () => {
  it.each([
    ["", "60", "INVALID_START"],
    ["25:00", "60", "INVALID_START"],
    ["10:30", "", "INVALID_DURATION"],
    ["10:30", "abc", "INVALID_DURATION"],
    ["10:30", "1.5", "INVALID_DURATION"],
    ["10:30", "-5", "INVALID_DURATION"],
    ["23:30", "60", "OUTSIDE_DAY"],
    ["08:00", "30", "START_IN_PAST"],
  ])("start=%j duration=%j -> %s", (startTime, duration, code) => {
    const out = run({ startTime, duration, blocked: false });
    expect(out.available).toBe(false);
    expect(out.reasonCode).toBe(code);
  });

  it("boundaries: 1 and 120 minutes are accepted", () => {
    expect(validateContractInput({ startTime: "10:30", duration: 1, blocked: false, bookings: [], currentTime: 480 }).ok).toBe(true);
    expect(validateContractInput({ startTime: "10:30", duration: 120, blocked: false, bookings: [], currentTime: 480 }).ok).toBe(true);
  });

  it("adjacent on the other side (ends exactly when a booking starts) is available", () => {
    expect(run({ startTime: "12:00", duration: "60", blocked: false }).reasonCode).toBe("AVAILABLE");
  });

  it("HTML in input is treated as invalid data, never rendered", () => {
    const out = run({ startTime: "<img src=x onerror=alert(1)>", duration: "60", blocked: false });
    expect(out.reasonCode).toBe("INVALID_START");
    expect(out.message).not.toContain("<");
  });
});
