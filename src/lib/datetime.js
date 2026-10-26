const pad = (n) => String(n).padStart(2, "0");

/**
 * Format a Date for <input type="datetime-local" /> in the user's local timezone.
 */
export function toDatetimeLocalValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse a datetime-local string as local wall time (never UTC).
 */
export function datetimeLocalToDate(value) {
  if (!value) return null;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes, seconds = 0] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Convert a datetime-local value to an ISO UTC string for storage.
 */
export function datetimeLocalToISO(value) {
  const date = datetimeLocalToDate(value);
  return date ? date.toISOString() : value;
}

export function formatLocalDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isSameLocalDay(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
