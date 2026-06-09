"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationFields, useEventLocations } from "@/components/location-combobox";
import { useI18n } from "@/lib/i18n";
import { formatCents, formatDate, formatTime } from "@/lib/utils";
import { APP_TIMEZONE, formatEventDateKey, formatEventTimeKey } from "@/lib/timezone";
import { downloadFromPost, downloadGet } from "@/lib/download";

interface Registration {
  id: string;
  status: string;
  registeredParticipantCount: number;
  actualParticipantCount: number | null;
  memberAccount: { id: string; displayName: string; balanceCents: number };
}

interface SettlementItem {
  registrationId: string;
  memberAccountId: string;
  displayName: string;
  actualParticipantCount: number;
  calculatedDeductionCents: number;
  overrideDeductionCents: number | null;
  finalDeductionCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
}

interface SettlementPreview {
  totalCostCents: number;
  totalActualParticipants: number;
  calculatedPerPersonCostCents: number;
  items: SettlementItem[];
  hasOverrides: boolean;
}

export default function AdminEventDetailPage() {
  const { t, tNested } = useI18n();
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [totalCost, setTotalCost] = useState("");
  const [actualCounts, setActualCounts] = useState<Record<string, number>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [message, setMessage] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const locations = useEventLocations();
  const [editForm, setEditForm] = useState({
    title: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    locationName: "",
    address: "",
    notes: "",
  });

  function load() {
    fetch(`/api/admin/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data);
        const counts: Record<string, number> = {};
        (data.registrations as Registration[]).forEach((r) => {
          counts[r.id] =
            r.actualParticipantCount ??
            (r.status === "CANCELLED" ? 0 : r.registeredParticipantCount);
        });
        setActualCounts(counts);
        setEditForm({
          title: data.title as string,
          eventDate: formatEventDateKey(new Date(data.eventDate as string)),
          startTime: formatEventTimeKey(new Date(data.startTime as string)),
          endTime: formatEventTimeKey(new Date(data.endTime as string)),
          locationName: (data.locationName as string | null) ?? "",
          address: (data.address as string | null) ?? "",
          notes: (data.notes as string | null) ?? "",
        });
      });
  }

  useEffect(() => { load(); }, [id]);

  function buildItems() {
    const regs = (event as { registrations: Registration[] }).registrations;
    return regs.map((r) => ({
      registrationId: r.id,
      actualParticipantCount: actualCounts[r.id] ?? 0,
      overrideDeductionCents: overrides[r.id]
        ? Math.round(parseFloat(overrides[r.id]) * 100)
        : null,
    }));
  }

  async function handlePreview() {
    const costCents = Math.round(parseFloat(totalCost) * 100);
    if (isNaN(costCents)) return;

    const res = await fetch(`/api/admin/events/${id}/settlement-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalCostCents: costCents, items: buildItems() }),
    });

    if (res.ok) {
      setPreview(await res.json());
      setMessage("");
    } else {
      const data = await res.json();
      setMessage(data.error ?? t("error"));
      setPreview(null);
    }
  }

  async function handleSettleAndDownload() {
    if (!confirm(t("settlementConfirmDetail"))) return;
    const costCents = Math.round(parseFloat(totalCost) * 100);
    const payload = { totalCostCents: costCents, items: buildItems() };

    const result = await downloadFromPost(
      `/api/admin/events/${id}/settle-and-export`,
      payload,
      `pickleball-balance-snapshot.csv`
    );

    if (result.settled) {
      setMessage(result.success ? t("settlementSuccess") : t("settlementCsvFailed"));
      setPreview(null);
      load();
    } else {
      setMessage(result.error ?? t("error"));
    }
  }

  function handleDownloadCurrentBalances() {
    downloadGet("/api/admin/member-accounts/balance-export.csv");
  }

  async function handleCancelEvent() {
    if (!confirm("Cancel this event?")) return;
    await fetch(`/api/admin/events/${id}/cancel`, { method: "POST" });
    load();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    setSavingEdit(true);

    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSavingEdit(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? t("error"));
      return;
    }

    setMessage(t("eventUpdated"));
    load();
  }

  async function handleSaveNotes() {
    setEditError("");
    setSavingEdit(true);
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editForm.notes }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? t("error"));
      return;
    }
    setMessage(t("eventUpdated"));
    load();
  }

  if (!event) return <p>{t("loading")}</p>;

  const ev = event as {
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    locationName: string | null;
    address: string | null;
    notes: string | null;
    status: string;
    expectedTotal: number;
    actualTotal: number;
    totalCostCents: number | null;
    registrations: Registration[];
  };

  const isOpen = ev.status === "OPEN";
  const isCompleted = ev.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/events">← {t("events")}</Link></Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{ev.title}</h1>
          <p>
            {formatDate(ev.eventDate, "zh-CN", APP_TIMEZONE)} ·{" "}
            {formatTime(ev.startTime, "zh-CN", APP_TIMEZONE)} –{" "}
            {formatTime(ev.endTime, "zh-CN", APP_TIMEZONE)}
          </p>
          {ev.locationName && <p>{ev.locationName}</p>}
          {ev.address && <p className="text-sm text-muted-foreground">{ev.address}</p>}
          <Badge className="mt-2">{tNested(`eventStatuses.${ev.status}`)}</Badge>
        </div>
        {isOpen && (
          <Button variant="destructive" size="sm" onClick={handleCancelEvent}>{t("cancel")} Event</Button>
        )}
      </div>

      <div className="flex gap-4 text-sm">
        <span>{t("expectedTotal")}: {ev.expectedTotal}</span>
        <span>{t("actualTotal")}: {ev.actualTotal}</span>
        {ev.totalCostCents != null && (
          <span>{t("totalCourtCost")}: {formatCents(ev.totalCostCents)}</span>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>{t("editEvent")}</CardTitle></CardHeader>
        <CardContent>
          {isCompleted ? (
            <div className="max-w-lg space-y-3">
              <div>
                <Label>{t("notes")}</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <Button onClick={handleSaveNotes} disabled={savingEdit}>{t("save")}</Button>
            </div>
          ) : (
            <form onSubmit={handleSaveEdit} className="max-w-lg space-y-3">
              <div>
                <Label>{t("title")}</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("date")} *</Label>
                <Input
                  type="date"
                  value={editForm.eventDate}
                  onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start *</Label>
                  <Input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>End *</Label>
                  <Input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <LocationFields
                locations={locations}
                locationName={editForm.locationName}
                address={editForm.address}
                onLocationNameChange={(locationName) =>
                  setEditForm((prev) => ({ ...prev, locationName }))
                }
                onAddressChange={(address) => setEditForm((prev) => ({ ...prev, address }))}
                onLocationSelect={(locationName, address) =>
                  setEditForm((prev) => ({ ...prev, locationName, address }))
                }
              />
              <div>
                <Label>{t("notes")}</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <Button type="submit" disabled={savingEdit}>{t("save")}</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("registrationList")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                <th className="p-2 text-left">{t("member")}</th>
                <th className="p-2 text-left">{t("status")}</th>
                <th className="p-2 text-right">{t("registeredCount")}</th>
                <th className="p-2 text-right">{t("actualParticipants")}</th>
                {!isCompleted && <th className="p-2 text-right">{t("overrideDeduction")} ($)</th>}
              </tr>
            </thead>
            <tbody>
              {ev.registrations.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.memberAccount.displayName}</td>
                  <td className="p-2">{tNested(`registrationStatus.${r.status}`)}</td>
                  <td className="p-2 text-right">{r.registeredParticipantCount}</td>
                  <td className="p-2 text-right">
                    {isCompleted ? (
                      r.actualParticipantCount ?? 0
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        className="ml-auto w-16"
                        value={actualCounts[r.id] ?? 0}
                        onChange={(e) =>
                          setActualCounts((c) => ({
                            ...c,
                            [r.id]: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                      />
                    )}
                  </td>
                  {!isCompleted && (
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        className="ml-auto w-20"
                        placeholder="—"
                        value={overrides[r.id] ?? ""}
                        onChange={(e) =>
                          setOverrides((o) => ({ ...o, [r.id]: e.target.value }))
                        }
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isOpen && (
        <Card>
          <CardHeader><CardTitle>{t("settlementPreview")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("totalCourtCost")} ($)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePreview}>{t("settlementPreview")}</Button>
              {preview && (
                <Button variant="destructive" onClick={handleSettleAndDownload}>
                  {t("settleAndDownload")}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleDownloadCurrentBalances}>
                {t("downloadCurrentBalances")}
              </Button>
            </div>

            {preview && (
              <div className="space-y-2">
                <p className="text-sm">
                  {t("perPersonCost")}: {formatCents(preview.calculatedPerPersonCostCents)} ·{" "}
                  {t("totalActualParticipants")}: {preview.totalActualParticipants}
                </p>
                {preview.hasOverrides && (
                  <p className="text-sm text-amber-600">{t("overrideWarning")}</p>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">{t("member")}</th>
                      <th className="p-2 text-right">{t("calculatedDeduction")}</th>
                      <th className="p-2 text-right">{t("finalDeduction")}</th>
                      <th className="p-2 text-right">{t("balanceAfter")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items
                      .filter((i) => i.finalDeductionCents > 0)
                      .map((i) => (
                        <tr key={i.registrationId} className="border-b">
                          <td className="p-2">{i.displayName} ({i.actualParticipantCount})</td>
                          <td className="p-2 text-right">{formatCents(i.calculatedDeductionCents)}</td>
                          <td className="p-2 text-right text-destructive">-{formatCents(i.finalDeductionCents)}</td>
                          <td className="p-2 text-right">{formatCents(i.balanceAfterCents)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {message && <p className="text-sm text-green-700">{message}</p>}
    </div>
  );
}
