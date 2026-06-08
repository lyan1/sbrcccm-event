"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PublicLayout } from "@/components/public-layout";
import { EventCalendar } from "@/components/event-calendar";
import { DateEventPanel } from "@/components/date-event-panel";
import { PromotionalSection, type PromoCard } from "@/components/promotional-section";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { monthRange, toDateKey, type CalendarEventSummary } from "@/lib/calendar";

export default function HomePage() {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventSummary[]>([]);
  const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasAutoSelectedDate = useRef(false);

  useEffect(() => {
    const { from, to } = monthRange(month.getFullYear(), month.getMonth());
    setLoading(true);

    fetch(`/api/home?from=${from}&to=${to}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("home fetch failed");
        return r.json() as Promise<{ events?: CalendarEventSummary[]; promotions?: PromoCard[] }>;
      })
      .then((data) => {
        const events = data.events ?? [];
        setCalendarEvents(events);
        setPromoCards(Array.isArray(data.promotions) ? data.promotions : []);

        if (!hasAutoSelectedDate.current) {
          const today = toDateKey(new Date());
          const upcoming = events
            .filter((e) => e.status === "OPEN" && e.eventDate >= today)
            .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
          if (upcoming.length > 0) {
            setSelectedDate(new Date(`${upcoming[0].eventDate}T12:00:00`));
          }
          hasAutoSelectedDate.current = true;
        }

        setLoading(false);
      })
      .catch(() => {
        setCalendarEvents([]);
        setPromoCards([]);
        setLoading(false);
      });
  }, [month, refreshKey]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = toDateKey(selectedDate);
    return calendarEvents.filter((e) => e.eventDate === key);
  }, [selectedDate, calendarEvents]);

  const quickActions = [
    { href: "/events", label: t("bulkRegistration") },
    { href: "/my-registrations", label: t("manageRegistrations") },
    { href: "/balance", label: t("balance") },
    { href: "/payment-info", label: t("paymentInfo") },
    { href: "/add-name", label: t("addNewName") },
  ];

  return (
    <PublicLayout>
      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("calendar")}</h2>
          <EventCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={calendarEvents}
            loading={loading}
            month={month}
            onMonthChange={setMonth}
          />
        </section>

        <DateEventPanel
          selectedDate={selectedDate}
          dayEvents={dayEvents}
          onRefreshCalendar={() => setRefreshKey((k) => k + 1)}
        />

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("quickActions")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((item) => (
              <Button key={item.href} asChild variant="outline" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </section>

        <PromotionalSection cards={promoCards} />
      </div>
    </PublicLayout>
  );
}
