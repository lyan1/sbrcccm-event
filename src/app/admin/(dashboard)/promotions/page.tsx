"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface PromoCard {
  id: string;
  titleZh: string;
  titleEn: string | null;
  descriptionZh: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isVisible: boolean;
  displayOrder: number;
}

export default function AdminPromotionsPage() {
  const { t } = useI18n();
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    titleZh: "",
    titleEn: "",
    descriptionZh: "",
    descriptionEn: "",
    linkUrl: "",
    linkLabelZh: "",
    linkLabelEn: "",
    displayOrder: "0",
  });

  function load() {
    fetch("/api/admin/promotions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCards(data);
        else setCards([]);
      })
      .catch(() => setCards([]));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    formData.append("isVisible", "true");
    if (file) formData.append("image", file);

    const res = await fetch("/api/admin/promotions", { method: "POST", body: formData });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("error"));
      return;
    }

    setShowForm(false);
    setFile(null);
    setForm({
      titleZh: "",
      titleEn: "",
      descriptionZh: "",
      descriptionEn: "",
      linkUrl: "",
      linkLabelZh: "",
      linkLabelEn: "",
      displayOrder: "0",
    });
    load();
  }

  async function toggleVisible(card: PromoCard) {
    await fetch(`/api/admin/promotions/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !card.isVisible }),
    });
    load();
  }

  async function handleHide(id: string) {
    if (!confirm(t("delete") + "?")) return;
    await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("promotions")}</h1>
        <Button onClick={() => setShowForm(!showForm)}>{t("create")}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{t("create")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
              <div><Label>标题 (中文) *</Label><Input value={form.titleZh} onChange={(e) => setForm({ ...form, titleZh: e.target.value })} required /></div>
              <div><Label>Title (EN)</Label><Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>描述 (中文)</Label><Textarea value={form.descriptionZh} onChange={(e) => setForm({ ...form, descriptionZh: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description (EN)</Label><Textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} /></div>
              <div><Label>Link URL</Label><Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></div>
              <div><Label>Display order</Label><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
              <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{t("save")}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.id}>
            <CardContent className="space-y-3 pt-4">
              {card.imageUrl && (
                <Image src={card.imageUrl} alt={card.titleZh} width={300} height={120} className="h-28 w-full rounded object-cover" unoptimized />
              )}
              <p className="font-medium">{card.titleZh}</p>
              {card.titleEn && <p className="text-sm text-muted-foreground">{card.titleEn}</p>}
              <div className="flex items-center gap-2">
                <Switch checked={card.isVisible} onCheckedChange={() => toggleVisible(card)} />
                <span className="text-sm">{card.isVisible ? t("visible") : t("hide")}</span>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleHide(card.id)}>{t("delete")}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
