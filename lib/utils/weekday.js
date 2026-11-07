// Mon=1 ... Sun=7 (ISO). Works on plain "YYYY-MM-DD" strings, so it never depends on server/browser timezone.
export const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 7, label: "Sunday", short: "Sun" },
];

export function weekdayOf(dateStr) {
  const g = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0=Sun
  return ((g + 6) % 7) + 1;
}
