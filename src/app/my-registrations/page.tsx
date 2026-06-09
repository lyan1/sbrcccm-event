"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicLayout } from "@/components/public-layout";
import { MemberAccountPicker } from "@/components/member-account-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/utils";
import { APP_TIMEZONE, formatEventDateKey, formatEventTimeKey } from "@/lib/timezone";
import { getEventDisplayStatus, isRegistrationOpen } from "@/lib/calendar";
import { getSelectedMember, setSelectedMember } from "@/lib/member-storage";

interface Registration {
  id: string;
  registeredParticipantCount: number;
  status: string;
  event: {
    id: string;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    locationName: string | null;
    status: string;
  };
}

export default function MyRegistrationsPage() {
  const { t, language, tNested } = useI18n();
  const locale = language === "zh" ? "zh-CN" : "en-US";

  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [upcoming, setUpcoming] = useState<Registration[]>([]);
  const [past, setPast] = useState<Registration[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = getSelectedMember();
    if (stored) {
      setMemberId(stored.id);
      setMemberName(stored.displayName);
    }
  }, []);

  function load() {
    if (!memberId) return;
    setLoading(true);
    fetch(`/api/member-accounts/${encodeURIComponent(memberId)}/registrations?scope=split`)
      .then(async (r) => {
        if (!r.ok) throw new Error("registrations failed");
        return r.json() as Promise<{ upcoming?: Registration[]; past?: Registration[] }>;
      })
      .then((data) => {
        setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
        setPast(Array.isArray(data.past) ? data.past : []);
        setLoading(false);
      })
      .catch(() => {
        setUpcoming([]);
        setPast([]);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [memberId]);

  async function handleCancel(id: string) {
    if (!confirm(t("confirmCancel"))) return;
    await fetch(`/api/registrations/${id}/cancel`, { method: "POST" });
    load();
  }

  async function handleUpdate(id: string) {
    await fetch(`/api/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registeredParticipantCount: editCount }),
    });
    setEditingId(null);
    load();
  }

  function canModify(reg: Registration) {
    const eventDate = formatEventDateKey(new Date(reg.event.eventDate));
    const endTime = formatEventTimeKey(new Date(reg.event.endTime));
    return (
      isRegistrationOpen(reg.event.status, eventDate, endTime) &&
      reg.status === "REGISTERED"
    );
  }

  function RegistrationCard({ reg }: { reg: Registration }) {
    const eventDate = formatEventDateKey(new Date(reg.event.eventDate));
    const endTime = formatEventTimeKey(new Date(reg.event.endTime));
    const modifiable = canModify(reg);
    const eventStatus = getEventDisplayStatus(reg.event.status, eventDate, endTime);
    return (
      <Card>
        <CardHeader className="pb-2">
          {memberName && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t("nameLabel")}: </span>
              <span className="font-medium">{memberName}</span>
            </p>
          )}
          <CardTitle className="text-base">{reg.event.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatDate(reg.event.eventDate, locale, APP_TIMEZONE)} ·{" "}
            {formatTime(reg.event.startTime, locale, APP_TIMEZONE)}
          </p>
          {reg.event.locationName && <p className="text-sm">{reg.event.locationName}</p>}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Badge variant={reg.status === "REGISTERED" ? "success" : "secondary"}>
              {tNested(`registrationStatus.${reg.status}`)}
            </Badge>
            <Badge variant="outline">{tNested(`eventStatuses.${eventStatus}`)}</Badge>
          </div>
          <p className="text-sm">
            {t("registeredCount")}: {reg.registeredParticipantCount}
          </p>
          {modifiable && (
            <div className="flex gap-2 pt-2">
              {editingId === reg.id ? (
                <>
                  <Input
                    type="number"
                    min={1}
                    value={editCount}
                    onChange={(e) => setEditCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20"
                  />
                  <Button size="sm" onClick={() => handleUpdate(reg.id)}>
                    {t("save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    {t("cancel")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(reg.id);
                      setEditCount(reg.registeredParticipantCount);
                    }}
                  >
                    {t("modify")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleCancel(reg.id)}>
                    {t("cancel")}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <PublicLayout>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← {t("home")}</Link>
        </Button>

        <h1 className="text-xl font-bold">{t("manageRegistrations")}</h1>
        <p className="text-sm text-muted-foreground">{t("manageRegistrationsHint")}</p>

        <Card className="p-4">
          <MemberAccountPicker
            value={memberId}
            onChange={(m) => {
              setMemberId(m.id);
              setMemberName(m.displayName);
              setSelectedMember(m);
            }}
          />
        </Card>

        {!memberId ? (
          <p className="text-muted-foreground">{t("noAccountSelected")}</p>
        ) : loading ? (
          <p>{t("loading")}</p>
        ) : (
          <>
            <section>
              <h2 className="mb-3 font-semibold">{t("upcomingRegistrations")}</h2>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground">{t("noRegistrations")}</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((r) => (
                    <RegistrationCard key={r.id} reg={r} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-semibold">{t("pastRegistrations")}</h2>
              {past.length === 0 ? (
                <p className="text-muted-foreground">{t("noRegistrations")}</p>
              ) : (
                <div className="space-y-3">
                  {past.map((r) => (
                    <RegistrationCard key={r.id} reg={r} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
