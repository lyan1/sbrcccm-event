import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(
  date: Date | string,
  locale = "zh-CN",
  timeZone?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatTime(
  date: Date | string,
  locale = "zh-CN",
  timeZone?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatWeekday(
  date: Date | string,
  locale = "zh-CN",
  timeZone?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    weekday: "long",
    ...(timeZone ? { timeZone } : {}),
  });
}

export { parseDateTimeInTimezone as parseDateTime } from "./timezone";

export function getDateRangeStart(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "12m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 12);
      return d;
    }
    case "all":
      return null;
    default:
      return null;
  }
}
