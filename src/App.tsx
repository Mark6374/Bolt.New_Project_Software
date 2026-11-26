import { useMemo, useState } from "react";
import {
  Building2,
  CalendarCheck,
  Clock,
  DoorOpen,
  Users,
  XCircle,
  CheckCircle2,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { SAMPLE_ROOMS } from "./roomData";
import { checkAvailability } from "./availability";
import { evaluateContract, type ContractOutput } from "./contract/contract";
import {
  minutesToTimeString,
  timeStringToMinutes,
} from "./timeUtils";
import { Timeline, Legend, nowInMinutes } from "./components/Timeline";
import { ExplainPanel } from "./components/ExplainPanel";
import type { CheckResult } from "./types";

function App() {
  const [rooms] = useState(SAMPLE_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0].id);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [blocked, setBlocked] = useState(SAMPLE_ROOMS[0].blocked);
  const [contract, setContract] = useState<ContractOutput | null>(null);
  const [currentTime, setCurrentTime] = useState(() => nowInMinutes());
  const [result, setResult] = useState<CheckResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [checkId, setCheckId] = useState(0);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId)!,
    [rooms, selectedRoomId],
  );

  const handleCheck = () => {
    setFormError(null);

    // Layer 1+2: shared Practice #13 contract (validation, then rule engine).
    const out = evaluateContract({
      startTime,
      duration,
      blocked,
      bookings: selectedRoom.bookings,
      currentTime,
    });
    setContract(out);

    const start = timeStringToMinutes(startTime);
    const minutes = Number(duration);
    const isValidationError = !["AVAILABLE", "OVERLAP", "ROOM_BLOCKED"].includes(out.reasonCode);
    if (isValidationError || start === null) {
      // AC6: understandable feedback; never leave a stale result on screen.
      setResult(null);
      setFormError(`${out.message} (${out.reasonCode})`);
      return;
    }

    const room = { ...selectedRoom, blocked };
    const candidate = { start, end: start + minutes, bookedBy: "Check (preview only)" };
    const decision = checkAvailability(room, candidate, currentTime);
    setResult({ room, interval: candidate, decision });
    setCheckId((n) => n + 1);
  };

  const handleReset = () => {
    setResult(null);
    setContract(null);
    setFormError(null);
    setStartTime("09:00");
    setDuration("60");
    setBlocked(selectedRoom.blocked);
    setCurrentTime(nowInMinutes());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Smart Campus Room Availability
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              Check whether a campus room is free for your desired time slot.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* ---------- Form card ---------- */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <DoorOpen className="h-5 w-5 text-teal-600" />
              Check a Room
            </h2>

            {/* Room selector */}
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Select Room
            </label>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {rooms.map((room) => {
                const active = room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setBlocked(room.blocked);
                      setResult(null);
                      setContract(null);
                      setFormError(null);
                    }}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      {room.name}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {room.building}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" /> {room.capacity} seats
                    </span>
                    {room.blocked && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        <XCircle className="h-3 w-3" /> Blocked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current time */}
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Current Time (HH:MM)
            </label>
            <div className="mb-4 flex items-center gap-2">
              <input
                type="time"
                value={minutesToTimeString(currentTime)}
                onChange={(e) => {
                  const v = timeStringToMinutes(e.target.value);
                  if (v !== null) setCurrentTime(v);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                onClick={() => setCurrentTime(nowInMinutes())}
                title="Set to real current time"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Now
              </button>
            </div>

            {/* Start & end time */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-slate-400" /> Start
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-slate-400" /> Duration (min)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  aria-label="Duration in minutes"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Room status (blocked flag) */}
            <label className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">
                Room status:{" "}
                <span className={blocked ? "text-red-700" : "text-emerald-700"}>
                  {blocked ? "Blocked" : "Open"}
                </span>
              </span>
              <input
                type="checkbox"
                aria-label="Room is blocked"
                checked={blocked}
                onChange={(e) => {
                  setBlocked(e.target.checked);
                  setResult(null);
                  setContract(null);
                }}
                className="h-4 w-4 accent-red-600"
              />
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCheck}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"
              >
                Check Availability
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>

            {formError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
          </section>

          {/* ---------- Result + schedule card ---------- */}
          <section className="flex flex-col gap-6">
            {/* Result */}
            {result && (
              <div
                className={`rounded-2xl border p-5 shadow-sm transition-all sm:p-6 ${
                  result.decision.status === "available"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  {result.decision.status === "available" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  <h2 className="text-lg font-bold">
                    <span
                      className={
                        result.decision.status === "available"
                          ? "text-emerald-800"
                          : "text-red-800"
                      }
                    >
                      {result.decision.status === "available"
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </h2>
                </div>
                <p className="text-sm text-slate-700">
                  <strong>{result.room.name}</strong> from{" "}
                  {minutesToTimeString(result.interval.start)} to{" "}
                  {minutesToTimeString(result.interval.end)} (
                  {result.interval.end - result.interval.start} min)
                </p>
                {result.decision.status === "unavailable" && (
                  <ul className="mt-3 space-y-1.5">
                    {result.decision.reasons.map((reason, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-red-700"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
                {contract && (
                  <p className="mt-3 rounded-md bg-white/70 px-2 py-1 font-mono text-xs text-slate-600" data-testid="contract-output">
                    {`available=${String(contract.available)} · reasonCode=${contract.reasonCode}`}
                  </p>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  This is a read-only check — no booking is created or modified.
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Confirmed by booking rules (deterministic).</p>
              </div>
            )}

            {result && <ExplainPanel key={checkId} result={result} />}

            {!result && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
                <CalendarCheck className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">
                  Select a room, enter a start time and duration, and press{" "}
                  <span className="font-semibold text-slate-700">
                    Check Availability
                  </span>{" "}
                  to see the result.
                </p>
              </div>
            )}

            {/* Existing schedule for selected room */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Building2 className="h-5 w-5 text-teal-600" />
                {selectedRoom.name}
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                {selectedRoom.building} · {selectedRoom.capacity} seats ·{" "}
                {selectedRoom.blocked ? "Blocked" : "Open"}
              </p>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Existing Bookings
              </p>
              {selectedRoom.bookings.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No existing bookings for this room.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedRoom.bookings.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-700">
                        {minutesToTimeString(b.start)} –{" "}
                        {minutesToTimeString(b.end)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {b.bookedBy}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Visual timeline */}
              <div className="mt-5">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Today’s Timeline (00:00 – 24:00)
                </p>
                <Timeline
                  bookings={selectedRoom.bookings}
                  blocked={selectedRoom.blocked}
                  candidate={
                    result && result.room.id === selectedRoom.id
                      ? {
                          start: result.interval.start,
                          end: result.interval.end,
                          available: result.decision.status === "available",
                        }
                      : null
                  }
                />
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <Legend className="bg-slate-300" label="Booked" />
                  <Legend className="bg-red-400" label="Blocked" />
                  <Legend className="bg-emerald-400" label="Your slot (free)" />
                  <Legend className="bg-red-300" label="Your slot (conflict)" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Acceptance criteria reference */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-sm sm:p-6">
          <p className="mb-2 font-semibold text-slate-600">
            Validation Rules Applied
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            <li>· Duration must be 1–120 minutes and end by 24:00.</li>
            <li>· Start must be after the current time.</li>
            <li>· Blocked flag can be toggled to test AC4.</li>
            <li>· Blocked rooms are always rejected.</li>
            <li>· Overlapping bookings are rejected (touching is OK).</li>
            <li>· Checks are read-only — no data is changed.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
