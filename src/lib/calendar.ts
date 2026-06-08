import { EventStatus } from "@prisma/client";
import { formatEventDateKey, startOfEventDay } from "./timezone";

export interface CalendarEventSummary {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  status: EventStatus;
  registeredParticipantCount: number;
  registrationCount: number;
}

export interface DateMarker {
  date: string;
  openCount: number;
  completedCount: number;
  cancelledCount: number;
}

export function toDateKey(date: Date): string {
  return formatEventDateKey(date);
}

export function startOfToday(now = new Date()): Date {
  return startOfEventDay(formatEventDateKey(now));
}

export function todayDateKey(now = new Date()): string {
  return formatEventDateKey(now);
}

export function isPastEventDate(eventDate: string): boolean {
  return eventDate.slice(0, 10) < todayDateKey();
}

export function isRegistrationOpen(status: EventStatus | string, eventDate: string): boolean {
  return status === "OPEN" && !isPastEventDate(eventDate);
}

export function getEventDisplayStatus(
  status: EventStatus | string,
  eventDate: string
): EventStatus | "CLOSED" {
  if (status === "OPEN" && isPastEventDate(eventDate)) return "CLOSED";
  return status as EventStatus;
}

export function buildDateMarkers(events: CalendarEventSummary[]): Map<string, DateMarker> {
  const map = new Map<string, DateMarker>();

  for (const event of events) {
    const key = event.eventDate.slice(0, 10);
    const entry = map.get(key) ?? {
      date: key,
      openCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    };

    if (event.status === "OPEN") entry.openCount += 1;
    else if (event.status === "COMPLETED") entry.completedCount += 1;
    else if (event.status === "CANCELLED") entry.cancelledCount += 1;

    map.set(key, entry);
  }

  return map;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}
