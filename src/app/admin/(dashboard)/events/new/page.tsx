"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

export default function NewEventPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "Pickleball",
    eventDate: "",
    startTime: "18:00",
    endTime: "20:00",
    locationName: "",
    address: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t("error"));
      return;
    }
    router.push("/admin/events");
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/events">← {t("events")}</Link></Button>
      <h1 className="text-xl font-bold">{t("createEvent")}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label>{t("title")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>{t("date")} *</Label><Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Start *</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></div>
          <div><Label>End *</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></div>
        </div>
        <div><Label>{t("location")}</Label><Input value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} /></div>
        <div><Label>{t("address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">{t("create")}</Button>
      </form>
    </div>
  );
}
