import { describe, it, expect } from "vitest";
import { checkAvailability } from "../availability";
import { SAMPLE_ROOMS } from "../roomData";
import { buildExplainRequest } from "./contract";
import type { ExplanationAdapter } from "./adapters";
import { explainAvailability, validateExplanation } from "./service";

// Regression tests for the two confirmed review findings fixed in Task 07.
const room = structuredClone(SAMPLE_ROOMS[0]); // Lecture Hall A, booking 09:00-10:00
const interval = { start: 570, end: 630, bookedBy: "x" };
const busy = buildExplainRequest({ room, interval, decision: checkAvailability(room, interval, 480) });

describe("R01 timeout must not depend on the adapter honouring AbortSignal (AC4)", () => {
  it("adapter that never settles and ignores the signal still yields a timeout fallback", async () => {
    const hanging: ExplanationAdapter = { label: "hanging", isMock: true, explain: () => new Promise(() => {}) };
    const out = await Promise.race([
      explainAvailability(busy, hanging, { timeoutMs: 30 }),
      new Promise((resolve) => setTimeout(() => resolve("STILL PENDING"), 500)),
    ]);
    expect(out).toMatchObject({ kind: "fallback", cause: "timeout" });
  });
});

describe("R02 output validator rejects invented people and contradictory claims (AC2)", () => {
  it.each([
    "The room cannot be used because Prof. Smith has it booked.",
    "It is not available because Dr Chen reserved it.",
    "Yes, you can use Lecture Hall A; it is not booked, so it cannot be refused.",
    "You can book Lecture Hall A now, it is not available only on paper.",
  ])("rejects: %s", (text) => {
    expect(validateExplanation({ explanation: text }, busy)).toBeNull();
  });
});
