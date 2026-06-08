"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/utils";
import { APP_TIMEZONE } from "@/lib/timezone";

interface Event {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  status: string;
}

export default function AdminEventsPage() {
  const { t, tNested } = useI18n();
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const params = status !== "all" ? `?status=${status}` : "";
    fetch(`/api/admin/events${params}`)
      .then((r) => r.json())
      .then(setEvents);
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("events")}</h1>
        <div className="flex gap-2">
          <Button asChild size="sm"><Link href="/admin/events/new">{t("createEvent")}</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/admin/events/bulk-create">{t("bulkCreate")}</Link></Button>
        </div>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("all")}</SelectItem>
          <SelectItem value="OPEN">{tNested("eventStatuses.OPEN")}</SelectItem>
          <SelectItem value="COMPLETED">{tNested("eventStatuses.COMPLETED")}</SelectItem>
          <SelectItem value="CANCELLED">{tNested("eventStatuses.CANCELLED")}</SelectItem>
        </SelectContent>
      </Select>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">{t("date")}</th>
              <th className="p-3 text-left">{t("time")}</th>
              <th className="p-3 text-left">{t("title")}</th>
              <th className="p-3 text-left">{t("location")}</th>
              <th className="p-3 text-left">{t("status")}</th>
              <th className="p-3 text-left">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{formatDate(e.eventDate, "zh-CN", APP_TIMEZONE)}</td>
                <td className="p-3">
                  {formatTime(e.startTime, "zh-CN", APP_TIMEZONE)} –{" "}
                  {formatTime(e.endTime, "zh-CN", APP_TIMEZONE)}
                </td>
                <td className="p-3">{e.title}</td>
                <td className="p-3">{e.locationName ?? "—"}</td>
                <td className="p-3">
                  <Badge variant="outline">{tNested(`eventStatuses.${e.status}`)}</Badge>
                </td>
                <td className="p-3">
                  <Link href={`/admin/events/${e.id}`} className="text-primary hover:underline">{t("edit")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
