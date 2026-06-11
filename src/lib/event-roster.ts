import { isEventEnded } from "./calendar";

export function canManageEventRoster(
  event: { status: string; eventDate: Date | string; endTime: Date | string },
  now = new Date()
): boolean {
  if (event.status === "CANCELLED" || event.status === "COMPLETED") return false;
  return event.status === "OPEN" && isEventEnded(event.eventDate, event.endTime, now);
}

export function assertCanManageEventRoster(
  event: { status: string; eventDate: Date | string; endTime: Date | string },
  now = new Date()
): void {
  if (!canManageEventRoster(event, now)) {
    throw new Error("Event roster cannot be edited in its current state");
  }
}
