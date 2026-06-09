import { EventStatus } from "@prisma/client";
import { formatEventDateKey, parseDateTimeInTimezone, startOfEventDay } from "./timezone";

export interface CalendarEventSummary {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  address: string | null;
  status: EventStatus;
  registeredParticipantCount: number;
  registrationCount: number;
}

export interface DateMarker {
  date: string;
  openCount: number;
  closedCount: number;
  completedCount: number;
  cancelledCount: number;
}

export type UserEventDisplayStatus = "OPEN" | "CLOSED";
export type AdminEventDisplayStatus = "OPEN" | "CLOSED" | "CANCELLED" | "COMPLETED";

export function toDateKey(date: Date): string {
  return formatEventDateKey(date);
}

export function startOfToday(now = new Date()): Date {
  return startOfEventDay(formatEventDateKey(now));
}

export function todayDateKey(now = new Date()): string {
  return formatEventDateKey(now);
}

export function parseEventEnd(eventDate: string | Date, endTime: string | Date): Date {
  if (endTime instanceof Date) return endTime;
  if (endTime.includes("T")) return new Date(endTime);
  const dateKey =
    typeof eventDate === "string" ? eventDate.slice(0, 10) : formatEventDateKey(eventDate);
  return parseDateTimeInTimezone(dateKey, endTime);
}

export function isEventEnded(
  eventDate: string | Date,
  endTime: string | Date,
  now = new Date()
): boolean {
  return now >= parseEventEnd(eventDate, endTime);
}

/** @deprecated Use isEventEnded with endTime instead. */
export function isPastEventDate(eventDate: string): boolean {
  return eventDate.slice(0, 10) < todayDateKey();
}

export function isRegistrationOpen(
  status: EventStatus | string,
  eventDate: string,
  endTime: string,
  now = new Date()
): boolean {
  return status === "OPEN" && !isEventEnded(eventDate, endTime, now);
}

export function isRegistrationOpenForEvent(
  event: { status: string; endTime: Date },
  now = new Date()
): boolean {
  return event.status === "OPEN" && event.endTime > now;
}

export function getEventDisplayStatus(
  status: EventStatus | string,
  eventDate: string,
  endTime: string,
  now = new Date()
): UserEventDisplayStatus {
  if (status === "OPEN" && !isEventEnded(eventDate, endTime, now)) return "OPEN";
  return "CLOSED";
}

export function getAdminEventDisplayStatus(
  status: EventStatus | string,
  eventDate: string | Date,
  endTime: string | Date,
  now = new Date()
): AdminEventDisplayStatus {
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "OPEN" && isEventEnded(eventDate, endTime, now)) return "CLOSED";
  return "OPEN";
}

export function needsSettlement(
  status: EventStatus | string,
  eventDate: string | Date,
  endTime: string | Date,
  now = new Date()
): boolean {
  return status === "OPEN" && isEventEnded(eventDate, endTime, now);
}

export function buildDateMarkers(
  events: CalendarEventSummary[],
  now = new Date()
): Map<string, DateMarker> {
  const map = new Map<string, DateMarker>();

  for (const event of events) {
    const key = event.eventDate.slice(0, 10);
    const entry = map.get(key) ?? {
      date: key,
      openCount: 0,
      closedCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    };

    if (event.status === "OPEN") {
      if (isEventEnded(event.eventDate, event.endTime, now)) entry.closedCount += 1;
      else entry.openCount += 1;
    } else if (event.status === "COMPLETED") entry.completedCount += 1;
    else if (event.status === "CANCELLED") entry.cancelledCount += 1;

    map.set(key, entry);
  }

  return map;
}

/** User calendar: green marker when at least one event is still open for registration. */
export function isCalendarDateAvailable(marker: DateMarker): boolean {
  return marker.openCount > 0;
}

/** User calendar: gray marker for dates with events that are no longer open. */
export function isCalendarDateClosed(marker: DateMarker): boolean {
  return marker.closedCount > 0 || marker.completedCount > 0 || marker.cancelledCount > 0;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}
