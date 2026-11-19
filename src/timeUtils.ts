export const MINUTES_PER_DAY = 1440;

/** Convert "HH:MM" string to minutes from midnight. Returns null if invalid. */
export function timeStringToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Convert minutes from midnight to "HH:MM" string. */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format minutes from midnight as "HH:MM" — alias used by availability rules. */
export function fmt(minutes: number): string {
  return minutesToTimeString(minutes);
}
