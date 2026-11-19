export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  blocked: boolean;
  bookings: Interval[];
}

export interface Interval {
  start: number; // minutes from midnight (0–1440)
  end: number; // minutes from midnight (0–1440)
  bookedBy: string;
}

export type AvailabilityDecision =
  | { status: "available" }
  | { status: "unavailable"; reasons: string[] };

export interface CheckResult {
  room: Room;
  interval: Interval;
  decision: AvailabilityDecision;
}
