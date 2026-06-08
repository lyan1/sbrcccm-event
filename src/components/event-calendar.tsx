"use client";

import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { zhCN, enUS } from "react-day-picker/locale";
import {
  buildDateMarkers,
  isPastEventDate,
  type CalendarEventSummary,
} from "@/lib/calendar";
import { useI18n } from "@/lib/i18n";
import "react-day-picker/style.css";

interface EventCalendarProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  events: CalendarEventSummary[];
  loading?: boolean;
  month: Date;
  onMonthChange: (month: Date) => void;
}

export function EventCalendar({
  selectedDate,
  onSelectDate,
  events,
  loading = false,
  month,
  onMonthChange,
}: EventCalendarProps) {
  const { language, t } = useI18n();
  const locale = language === "zh" ? zhCN : enUS;

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

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const eventsKey = events.map((e) => e.id).join(",");

  return (
    <div className="event-calendar rounded-lg border bg-card p-3">
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
      ) : (
        <DayPicker
          key={`${monthKey}-${eventsKey}`}
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          month={month}
          onMonthChange={onMonthChange}
          locale={locale}
          modifiers={modifiers}
          modifiersClassNames={{
            open: "event-day-open",
            openPast: "event-day-open-past",
            completed: "event-day-completed",
          }}
          className="w-full"
        />
      )}
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
