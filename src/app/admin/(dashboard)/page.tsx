"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { formatCents, formatDate } from "@/lib/utils";

interface DashboardData {
  upcomingEvents: Array<{ id: string; title: string; eventDate: string; locationName: string | null }>;
  eventsNeedingSettlement: Array<{ id: string; title: string; eventDate: string }>;
  recentRegistrations: Array<{
    id: string;
    registeredParticipantCount: number;
    memberAccount: { displayName: string };
    event: { title: string; eventDate: string };
  }>;
  recentPayments: Array<{
    id: string;
    amountCents: number;
    memberAccount: { displayName: string };
    createdAt: string;
  }>;
  recentDeductions: Array<{
    id: string;
    amountCents: number;
    memberAccount: { displayName: string };
    event: { title: string; eventDate: string } | null;
  }>;
  activeMemberCount: number;
  negativeBalanceCount: number;
  negativeBalanceAccounts: Array<{ id: string; displayName: string; balanceCents: number }>;
}

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p>{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link href="/admin/events/new">{t("createEvent")}</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/events/bulk-create">{t("bulkCreateEvents")}</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/images">{t("uploadQr")}</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("activeMembers")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.activeMemberCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("negativeBalances")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{data.negativeBalanceCount}</p></CardContent>
        </Card>
      </div>

      {data.eventsNeedingSettlement.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t("eventsNeedingSettlement")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.eventsNeedingSettlement.map((e) => (
              <Link key={e.id} href={`/admin/events/${e.id}`} className="block rounded border p-3 hover:bg-accent">
                {e.title} · {formatDate(e.eventDate)}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("upcomingEvents")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingEvents.map((e) => (
              <Link key={e.id} href={`/admin/events/${e.id}`} className="block text-sm hover:underline">
                {formatDate(e.eventDate)} · {e.title} {e.locationName && `· ${e.locationName}`}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("negativeBalances")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.negativeBalanceAccounts.map((m) => (
              <Link key={m.id} href={`/admin/members/${m.id}`} className="flex justify-between text-sm hover:underline">
                <span>{m.displayName}</span>
                <span className="text-destructive">{formatCents(m.balanceCents)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("recentRegistrations")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentRegistrations.map((r) => (
              <p key={r.id}>{r.memberAccount.displayName} → {r.event.title} ({r.registeredParticipantCount})</p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("recentPayments")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentPayments.map((p) => (
              <p key={p.id}>{p.memberAccount.displayName}: +{formatCents(p.amountCents)}</p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("recentDeductions")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentDeductions.map((d) => (
              <p key={d.id}>{d.memberAccount.displayName}: {formatCents(d.amountCents)}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
