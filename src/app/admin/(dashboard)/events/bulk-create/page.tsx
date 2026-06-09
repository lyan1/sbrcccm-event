"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationFields, useEventLocations } from "@/components/location-combobox";
import { useI18n } from "@/lib/i18n";

interface EventRow {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  notes: string;
}

const emptyRow = (): EventRow => ({
  title: "Pickleball",
  eventDate: "",
  startTime: "18:00",
  endTime: "20:00",
  locationName: "",
  address: "",
  notes: "",
});

export default function BulkCreateEventsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const locations = useEventLocations();
  const [rows, setRows] = useState<EventRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [error, setError] = useState("");

  function updateRow(i: number, field: keyof EventRow, value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function updateRowLocation(i: number, locationName: string, address: string) {
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, locationName, address } : row))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const events = rows.filter((r) => r.eventDate);
    if (events.some((r) => !r.locationName.trim() || !r.address.trim())) {
      setError(t("locationAddressRequired"));
      return;
    }
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
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <div>
                <Label>{t("date")} *</Label>
                <Input type="date" value={row.eventDate} onChange={(e) => updateRow(i, "eventDate", e.target.value)} />
              </div>
              <div>
                <Label>Start *</Label>
                <Input type="time" value={row.startTime} onChange={(e) => updateRow(i, "startTime", e.target.value)} />
              </div>
              <div>
                <Label>End *</Label>
                <Input type="time" value={row.endTime} onChange={(e) => updateRow(i, "endTime", e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}>
                  {t("removeRow")}
                </Button>
              </div>
            </div>
            <LocationFields
              locations={locations}
              locationName={row.locationName}
              address={row.address}
              locationId={`location-${i}`}
              onLocationNameChange={(locationName) => updateRow(i, "locationName", locationName)}
              onAddressChange={(address) => updateRow(i, "address", address)}
              onLocationSelect={(locationName, address) => updateRowLocation(i, locationName, address)}
            />
            <div>
              <Label>{t("notes")}</Label>
              <Input value={row.notes} onChange={(e) => updateRow(i, "notes", e.target.value)} />
            </div>
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
