"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface EventLocation {
  id: string;
  name: string;
  address: string;
}

export default function AdminLocationsPage() {
  const { t } = useI18n();
  const [locations, setLocations] = useState<EventLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });

  function load() {
    fetch("/api/admin/locations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLocations(data);
        else setLocations([]);
      })
      .catch(() => setLocations([]));
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ name: "", address: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(loc: EventLocation) {
    setEditingId(loc.id);
    setForm({ name: loc.name, address: loc.address });
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const url = editingId ? `/api/admin/locations/${editingId}` : "/api/admin/locations";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("error"));
      return;
    }

    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDeleteLocation"))) return;
    const res = await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("error"));
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("locations")}</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>{t("create")}</Button>
      </div>

      <p className="text-sm text-muted-foreground">{t("locationsHint")}</p>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t("edit") : t("create")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid max-w-lg gap-3">
              <div>
                <Label>{t("location")} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t("address")} *</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{t("save")}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>{t("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted">
              <th className="p-3 text-left">{t("location")}</th>
              <th className="p-3 text-left">{t("address")}</th>
              <th className="p-3 text-left">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-muted-foreground">
                  {t("noLocations")}
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id} className="border-b">
                  <td className="p-3">{loc.name}</td>
                  <td className="p-3">{loc.address}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(loc)}>
                        {t("edit")}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(loc.id)}>
                        {t("delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
