/** Church / app timezone for event dates and times. */
export const APP_TIMEZONE =
  process.env.APP_TIMEZONE ??
  process.env.NEXT_PUBLIC_APP_TIMEZONE ??
  "America/Chicago";

export function formatEventTimeKey(date: Date, timeZone = APP_TIMEZONE): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatEventDateKey(date: Date, timeZone = APP_TIMEZONE): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Parse a calendar date + wall-clock time in the app timezone to a UTC Date for storage.
 */
export function parseDateTimeInTimezone(
  dateStr: string,
  timeStr: string,
  timeZone = APP_TIMEZONE
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 2; i++) {
    const d = new Date(utc);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value);

    const tzAsUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      0
    );
    const wantUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += wantUtc - tzAsUtc;
  }

  return new Date(utc);
}

export function startOfEventDay(dateStr: string, timeZone = APP_TIMEZONE): Date {
  return parseDateTimeInTimezone(dateStr, "00:00", timeZone);
}
