export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/**
 * Format a Date for <input type="datetime-local" />
 */
export function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Returns the next meeting occurrence that starts after `now`.
 * @param {Array<{ dayOfWeek: number, startTime: string, endTime: string }>} meetingTimes
 * @param {Date} [now]
 * @returns {{ start: Date, end: Date } | null}
 */
export function getNextMeetingOccurrence(meetingTimes, now = new Date()) {
  if (!meetingTimes?.length) return null;

  const candidates = [];

  // Look ahead up to 8 days so we always cover the next week of slots
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);

    for (const slot of meetingTimes) {
      if (day.getDay() !== Number(slot.dayOfWeek)) continue;

      const [startHour, startMinute] = slot.startTime.split(":").map(Number);
      const [endHour, endMinute] = slot.endTime.split(":").map(Number);

      const start = new Date(day);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(day);
      end.setHours(endHour, endMinute, 0, 0);

      // Next meeting after now (includes later today if the slot hasn't started)
      if (start <= now) continue;

      candidates.push({ start, end });
    }
  }

  candidates.sort((a, b) => a.start - b.start);
  return candidates[0] ?? null;
}
