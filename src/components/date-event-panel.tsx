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

export interface PublicEventDetails {
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

interface DayEventSummary {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  status: string;
  registeredParticipantCount: number;
}

interface DateEventPanelProps {
  selectedDate: Date | undefined;
  dayEvents: DayEventSummary[];
  prefetchedDetails?: PublicEventDetails | null;
  onRefreshCalendar: () => void;
}

export function DateEventPanel({
  selectedDate,
  dayEvents,
  prefetchedDetails = null,
  onRefreshCalendar,
}: DateEventPanelProps) {
  const { t, language, tNested } = useI18n();
  const locale = language === "zh" ? zhCN : enUS;

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [details, setDetails] = useState<PublicEventDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editReg, setEditReg] = useState<PublicEventDetails["registrations"][0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!selectedDate || dayEvents.length === 0) {
      setExpandedEventId(null);
      setDetails(null);
      setDetailsLoading(false);
      return;
    }

    const preferred = dayEvents.find((e) => e.status === "OPEN") ?? dayEvents[0];
    setExpandedEventId(preferred.id);

    if (prefetchedDetails?.event.id === preferred.id) {
      setDetails(prefetchedDetails);
      setDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setDetailsLoading(true);

    fetch(`/api/events/${preferred.id}/public-details`)
      .then(async (r) => {
        if (!r.ok) throw new Error("failed to load event details");
        return r.json() as Promise<PublicEventDetails>;
      })
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, dayEvents, prefetchedDetails]);

  function fetchDetails(eventId: string) {
    setExpandedEventId(eventId);
    setDetailsLoading(true);
    return fetch(`/api/events/${eventId}/public-details`)
      .then(async (r) => {
        if (!r.ok) throw new Error("failed to load event details");
        return r.json() as Promise<PublicEventDetails>;
      })
      .then(setDetails)
      .catch(() => setDetails(null))
      .finally(() => setDetailsLoading(false));
  }

  function loadDetails(eventId: string) {
    if (expandedEventId === eventId && details?.event.id === eventId) {
      setExpandedEventId(null);
      setDetails(null);
      return;
    }

    void fetchDetails(eventId);
  }

  function refresh() {
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
        const isExpanded = expandedEventId === ev.id;
        const eventDetails = isExpanded && details?.event.id === ev.id ? details : null;
        const playerCount = eventDetails?.registeredParticipantCount ?? ev.registeredParticipantCount;

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
            <p className="text-sm font-medium">
              {t("registeredPlayers")}: {detailsLoading && isExpanded ? t("loading") : playerCount}
            </p>

            {isExpanded && (
              <div className="space-y-3 border-t pt-3">
                {detailsLoading ? (
                  <p className="text-sm text-muted-foreground">{t("loading")}</p>
                ) : eventDetails ? (
                  <>
                {eventDetails.event.notes && (
                  <p className="text-sm text-muted-foreground">{eventDetails.event.notes}</p>
                )}
                <ul className="space-y-1 text-sm">
                  {eventDetails.registrations.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span>
                        {r.displayName} — {r.registeredParticipantCount}
                      </span>
                      {canRegister && eventDetails.event.status === "OPEN" && (
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

                {canRegister && eventDetails.event.status === "OPEN" && (
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
                  </>
                ) : null}
              </div>
            )}

            {dayEvents.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDetails(ev.id)}
              >
                {isExpanded ? t("hideDetails") : t("showDetails")}
              </Button>
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
