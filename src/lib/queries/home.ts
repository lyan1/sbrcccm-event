import { todayDateKey, type CalendarEventSummary } from "@/lib/calendar";

export function pickFeaturedEventId(
  events: CalendarEventSummary[],
  featuredDate?: string | null
): string | null {
  if (featuredDate) {
    const dayEvents = events.filter((e) => e.eventDate === featuredDate);
    if (dayEvents.length === 0) return null;
    const preferred = dayEvents.find((e) => e.status === "OPEN") ?? dayEvents[0];
    return preferred.id;
  }

  const today = todayDateKey();
  const upcoming = events
    .filter((e) => e.status === "OPEN" && e.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  if (upcoming.length === 0) return null;

  const dayEvents = events.filter((e) => e.eventDate === upcoming[0].eventDate);
  const preferred = dayEvents.find((e) => e.status === "OPEN") ?? dayEvents[0];
  return preferred.id;
}
