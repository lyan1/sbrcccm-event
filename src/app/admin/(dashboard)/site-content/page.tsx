"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

type SiteContentKey = "PICKLEBALL_PURPOSE" | "USAGE_INSTRUCTIONS";

interface SiteContentBlock {
  key: SiteContentKey;
  contentZh: string;
  contentEn: string;
}

const BLOCK_LABELS: Record<SiteContentKey, "pickleballPurpose" | "usageInstructions"> = {
  PICKLEBALL_PURPOSE: "pickleballPurpose",
  USAGE_INSTRUCTIONS: "usageInstructions",
};

export default function AdminSiteContentPage() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState<SiteContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/site-content")
      .then(async (r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json() as Promise<SiteContentBlock[]>;
      })
      .then((data) => {
        setBlocks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setBlocks([]);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  function updateBlock(key: SiteContentKey, field: "contentZh" | "contentEn", value: string) {
    setBlocks((prev) =>
      prev.map((block) => (block.key === key ? { ...block, [field]: value } : block))
    );
    setSuccess(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    const res = await fetch("/api/admin/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("error"));
      return;
    }

    setSuccess(true);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("siteContent")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("siteContentHint")}</p>
      </div>

      {loading ? (
        <p>{t("loading")}</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {blocks.map((block) => (
            <Card key={block.key}>
              <CardHeader>
                <CardTitle className="text-base">{t(BLOCK_LABELS[block.key])}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${block.key}-zh`}>{t("chinese")}</Label>
                  <Textarea
                    id={`${block.key}-zh`}
                    value={block.contentZh}
                    onChange={(e) => updateBlock(block.key, "contentZh", e.target.value)}
                    rows={8}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${block.key}-en`}>{t("english")}</Label>
                  <Textarea
                    id={`${block.key}-en`}
                    value={block.contentEn}
                    onChange={(e) => updateBlock(block.key, "contentEn", e.target.value)}
                    rows={8}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{t("success")}</p>}

          <Button type="submit" disabled={saving}>
            {saving ? t("loading") : t("save")}
          </Button>
        </form>
      )}
    </div>
  );
}
