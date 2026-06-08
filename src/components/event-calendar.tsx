"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { zhCN, enUS } from "react-day-picker/locale";
import {
  buildDateMarkers,
  isPastEventDate,
  monthRange,
  type CalendarEventSummary,
} from "@/lib/calendar";
import { useI18n } from "@/lib/i18n";
import "react-day-picker/style.css";

interface EventCalendarProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  onEventsLoaded?: (events: CalendarEventSummary[]) => void;
  refreshKey?: number;
}

export function EventCalendar({
  selectedDate,
  onSelectDate,
  onEventsLoaded,
  refreshKey = 0,
}: EventCalendarProps) {
  const { language, t } = useI18n();
  const [month, setMonth] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const locale = language === "zh" ? zhCN : enUS;

  useEffect(() => {
    const { from, to } = monthRange(month.getFullYear(), month.getMonth());
    setLoading(true);
    fetch(`/api/calendar-events?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.events ?? [];
        setEvents(list);
        onEventsLoaded?.(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [month, refreshKey, onEventsLoaded]);

  const markers = useMemo(() => buildDateMarkers(events), [events]);

  const modifiers = useMemo(() => {
    const open: Date[] = [];
    const openPast: Date[] = [];
    const completed: Date[] = [];
    markers.forEach((m) => {
      const d = new Date(`${m.date}T12:00:00`);
      if (m.openCount > 0) {
        if (isPastEventDate(m.date)) openPast.push(d);
        else open.push(d);
      }
      if (m.completedCount > 0 && m.openCount === 0) completed.push(d);
    });
    return { open, openPast, completed };
  }, [markers]);

  return (
    <div className="event-calendar rounded-lg border bg-card p-3">
      {loading && <p className="mb-2 text-xs text-muted-foreground">{t("loading")}</p>}
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        month={month}
        onMonthChange={setMonth}
        locale={locale}
        modifiers={modifiers}
        modifiersClassNames={{
          open: "event-day-open",
          openPast: "event-day-open-past",
          completed: "event-day-completed",
        }}
        className="w-full"
      />
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-emerald-500" />
          {t("availableDate")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-slate-400" />
          {t("pastOpenDate")}
        </span>
      </div>
    </div>
  );
}
