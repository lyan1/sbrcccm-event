"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicLayout } from "@/components/public-layout";
import { MemberAccountPicker } from "@/components/member-account-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatTime, formatWeekday } from "@/lib/utils";
import { APP_TIMEZONE } from "@/lib/timezone";
import { setSelectedMember } from "@/lib/member-storage";

interface EventItem {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  address: string | null;
  expectedParticipantCount: number;
  selectedAccountRegistration: {
    registeredParticipantCount: number;
    status: string;
  } | null;
}

export default function EventsPage() {
  const { t, language } = useI18n();
  const locale = language === "zh" ? "zh-CN" : "en-US";

  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selected, setSelected] = useState<Record<string, { checked: boolean; count: number }>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function loadEvents(accountId: string) {
    if (!accountId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    const qs = `?memberAccountId=${encodeURIComponent(accountId)}`;
    fetch(`/api/events${qs}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<EventItem[]>;
      })
      .then((data) => {
        setEvents(data);
        const init: Record<string, { checked: boolean; count: number }> = {};
        data.forEach((e) => {
          init[e.id] = {
            checked: false,
            count: e.selectedAccountRegistration?.registeredParticipantCount ?? 1,
          };
        });
        setSelected(init);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    if (memberId) loadEvents(memberId);
  }, [memberId]);

  async function handleSubmit() {
    if (!memberId) {
      setMessage(t("noAccountSelected"));
      return;
    }

    const items = Object.entries(selected)
      .filter(([, v]) => v.checked)
      .map(([eventId, v]) => ({ eventId, participantCount: v.count }));

    if (items.length === 0) return;

    setSubmitting(true);
    const res = await fetch("/api/registrations/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberAccountId: memberId, items }),
    });

    if (res.ok) {
      setMessage(t("registrationSuccess"));
      setSelectedMember({ id: memberId, displayName: memberName });
      loadEvents(memberId);
    }
    setSubmitting(false);
  }

  return (
    <PublicLayout>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← {t("home")}</Link>
        </Button>

        <h1 className="text-xl font-bold">{t("bulkRegistration")}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("selectName")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberAccountPicker
              value={memberId}
              onChange={(m) => {
                setMemberId(m.id);
                setMemberName(m.displayName);
              }}
            />
          </CardContent>
        </Card>

        {!memberId ? (
          <p className="text-muted-foreground">{t("noAccountSelected")}</p>
        ) : loading ? (
          <p>{t("loading")}</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground">{t("noOpenEvents")}</p>
        ) : (
          <>
            <div className="space-y-3">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected[event.id]?.checked ?? false}
                        onCheckedChange={(c) =>
                          setSelected((s) => ({
                            ...s,
                            [event.id]: { ...s[event.id], checked: !!c },
                          }))
                        }
                      />
                      <div className="flex-1">
                        <CardTitle className="text-base">{event.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatWeekday(event.eventDate, locale, APP_TIMEZONE)} ·{" "}
                          {formatDate(event.eventDate, locale, APP_TIMEZONE)}
                        </p>
                        <p className="text-sm">
                          {formatTime(event.startTime, locale, APP_TIMEZONE)} –{" "}
                          {formatTime(event.endTime, locale, APP_TIMEZONE)}
                        </p>
                        {event.locationName && <p className="text-sm">{event.locationName}</p>}
                        {event.address && (
                          <p className="text-sm text-muted-foreground">{event.address}</p>
                        )}
                        {event.selectedAccountRegistration && (
                          <Badge variant="success" className="mt-2">
                            {t("alreadyRegistered")} ({event.selectedAccountRegistration.registeredParticipantCount})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {(selected[event.id]?.checked || event.selectedAccountRegistration) && (
                    <CardContent>
                      <Label>{t("participantCount")}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={selected[event.id]?.count ?? 1}
                        onChange={(e) =>
                          setSelected((s) => ({
                            ...s,
                            [event.id]: {
                              ...s[event.id],
                              count: Math.max(1, parseInt(e.target.value) || 1),
                            },
                          }))
                        }
                        className="mt-1 w-24"
                      />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {message && <p className="text-green-700">{message}</p>}

            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || !Object.values(selected).some((v) => v.checked)}
            >
              {submitting ? t("loading") : t("registerSelected")}
            </Button>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
