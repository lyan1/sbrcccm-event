"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEventDisplayStatus, isRegistrationOpen, toDateKey } from "@/lib/calendar";
import { useI18n } from "@/lib/i18n";
import { RegisterSomeoneDialog } from "@/components/register-someone-dialog";
import { EditRegistrationDialog } from "@/components/edit-registration-dialog";

interface PublicEventDetails {
  event: {
    id: string;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    locationName: string | null;
    notes: string | null;
    status: string;
  };
  registeredParticipantCount: number;
  registrations: Array<{
    id: string;
    memberAccountId: string;
    displayName: string;
    registeredParticipantCount: number;
    status: string;
  }>;
}

interface CalendarEventSummary {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  status: string;
}

interface DateEventPanelProps {
  selectedDate: Date | undefined;
  dayEvents: CalendarEventSummary[];
  onRefreshCalendar: () => void;
}

export function DateEventPanel({
  selectedDate,
  dayEvents,
  onRefreshCalendar,
}: DateEventPanelProps) {
  const { t, language, tNested } = useI18n();
  const locale = language === "zh" ? zhCN : enUS;

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [details, setDetails] = useState<PublicEventDetails | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editReg, setEditReg] = useState<PublicEventDetails["registrations"][0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setExpandedEventId(null);
    setDetails(null);
  }, [selectedDate]);

  function loadDetails(eventId: string) {
    setExpandedEventId(eventId);
    fetch(`/api/events/${eventId}/public-details`)
      .then((r) => r.json())
      .then(setDetails);
  }

  function refresh() {
    if (expandedEventId) loadDetails(expandedEventId);
    onRefreshCalendar();
  }

  if (!selectedDate) {
    return (
      <p className="text-sm text-muted-foreground">{t("selectDateHint")}</p>
    );
  }

  const dateLabel = format(selectedDate, "PPPP", { locale });
  const selectedDateKey = toDateKey(selectedDate);

  if (dayEvents.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="font-medium">{dateLabel}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("noEventsOnDate")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">{dateLabel}</h2>

      {dayEvents.map((ev) => {
        const canRegister = isRegistrationOpen(ev.status, selectedDateKey);
        return (
        <Card key={ev.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{ev.title}</CardTitle>
                <p className="text-sm">
                  {ev.startTime} – {ev.endTime}
                </p>
                {ev.locationName && <p className="text-sm">{ev.locationName}</p>}
              </div>
              <Badge variant="outline">
                {tNested(`eventStatuses.${getEventDisplayStatus(ev.status, selectedDateKey)}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDetails(ev.id)}
            >
              {expandedEventId === ev.id ? t("hideDetails") : t("showDetails")}
            </Button>

            {expandedEventId === ev.id && details?.event.id === ev.id && (
              <div className="space-y-3 border-t pt-3">
                {details.event.notes && (
                  <p className="text-sm text-muted-foreground">{details.event.notes}</p>
                )}
                <p className="text-sm font-medium">
                  {t("registeredPlayers")}: {details.registeredParticipantCount}
                </p>
                <ul className="space-y-1 text-sm">
                  {details.registrations.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span>
                        {r.displayName} — {r.registeredParticipantCount}
                      </span>
                      {canRegister && details.event.status === "OPEN" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditReg(r);
                            setEditOpen(true);
                          }}
                        >
                          {t("modify")}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>

                {canRegister && details.event.status === "OPEN" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setRegisterOpen(true)}>
                      {t("register")}
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/events">{t("bulkRegistration")}</Link>
                    </Button>
                  </div>
                )}
                {!canRegister && ev.status === "OPEN" && (
                  <p className="text-sm text-muted-foreground">{t("registrationClosed")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
      })}

      {expandedEventId && (
        <>
          <RegisterSomeoneDialog
            open={registerOpen}
            onOpenChange={setRegisterOpen}
            eventId={expandedEventId}
            onSuccess={refresh}
          />
          <EditRegistrationDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            registration={editReg}
            onSuccess={refresh}
          />
        </>
      )}
    </div>
  );
}
