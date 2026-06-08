"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

interface EventRow {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  notes: string;
}

const emptyRow = (): EventRow => ({
  title: "Pickleball",
  eventDate: "",
  startTime: "18:00",
  endTime: "20:00",
  locationName: "",
  notes: "",
});

export default function BulkCreateEventsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState<EventRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [error, setError] = useState("");

  function updateRow(i: number, field: keyof EventRow, value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const events = rows.filter((r) => r.eventDate);
    const res = await fetch("/api/admin/events/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t("error"));
      return;
    }
    router.push("/admin/events");
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/events">← {t("events")}</Link></Button>
      <h1 className="text-xl font-bold">{t("bulkCreateEvents")}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-4 sm:grid-cols-6">
            <Input type="date" value={row.eventDate} onChange={(e) => updateRow(i, "eventDate", e.target.value)} />
            <Input type="time" value={row.startTime} onChange={(e) => updateRow(i, "startTime", e.target.value)} />
            <Input type="time" value={row.endTime} onChange={(e) => updateRow(i, "endTime", e.target.value)} />
            <Input placeholder={t("location")} value={row.locationName} onChange={(e) => updateRow(i, "locationName", e.target.value)} />
            <Input placeholder={t("notes")} value={row.notes} onChange={(e) => updateRow(i, "notes", e.target.value)} />
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}>
              {t("removeRow")}
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, emptyRow()])}>
          {t("addRow")}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit">{t("create")}</Button>
      </form>
    </div>
  );
}
