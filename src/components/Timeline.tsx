import { minutesToTimeString, MINUTES_PER_DAY } from "@/timeUtils";

export function nowInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function Timeline({
  bookings,
  blocked,
  candidate,
}: {
  bookings: { start: number; end: number }[];
  blocked: boolean;
  candidate: { start: number; end: number; available: boolean } | null;
}) {
  const toPct = (min: number) => `${(min / MINUTES_PER_DAY) * 100}%`;

  return (
    <div className="relative h-8 w-full overflow-hidden rounded-lg bg-slate-100">
      {/* Hour gridlines */}
      {Array.from({ length: 24 }, (_, h) => h).map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 border-l border-slate-200"
          style={{ left: `${(h / 24) * 100}%` }}
        />
      ))}

      {/* Blocked overlay */}
      {blocked && (
        <div className="absolute inset-0 bg-red-400/40" title="Room blocked" />
      )}

      {/* Existing bookings */}
      {bookings.map((b, i) => (
        <div
          key={i}
          className="absolute top-0.5 bottom-0.5 rounded bg-slate-300"
          style={{ left: toPct(b.start), width: toPct(b.end - b.start) }}
          title={`Booked ${minutesToTimeString(b.start)}–${minutesToTimeString(b.end)}`}
        />
      ))}

      {/* Candidate slot */}
      {candidate && (
        <div
          className={`absolute top-0 bottom-0 rounded border-2 ${
            candidate.available
              ? "border-emerald-500 bg-emerald-400/60"
              : "border-red-500 bg-red-300/60"
          }`}
          style={{
            left: toPct(candidate.start),
            width: toPct(candidate.end - candidate.start),
          }}
          title="Your requested slot"
        />
      )}
    </div>
  );
}

export function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
