"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface AppImage {
  id: string;
  type: string;
  title: string;
  description: string | null;
  imageUrl: string;
  isVisible: boolean;
}

export default function AdminImagesPage() {
  const { t } = useI18n();
  const [images, setImages] = useState<AppImage[]>([]);
  const [type, setType] = useState("WECHAT_QR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    fetch("/api/admin/images").then((r) => r.json()).then(setImages);
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("type", type);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("image", file);
    formData.append("isVisible", "true");

    await fetch("/api/admin/images", { method: "POST", body: formData });
    setFile(null);
    setTitle("");
    setDescription("");
    setUploading(false);
    load();
  }

  async function toggleVisibility(img: AppImage) {
    await fetch(`/api/admin/images/${img.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !img.isVisible }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hide this image?")) return;
    await fetch(`/api/admin/images/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("images")}</h1>

      <Card>
        <CardHeader><CardTitle>{t("upload")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4 max-w-md">
            <div>
              <Label>{t("imageType")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["WECHAT_QR", "ZELLE_QR", "VENMO_QR", "OTHER"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("title")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div><Label>{t("description")}</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><Label>Image</Label><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></div>
            <Button type="submit" disabled={uploading}>{uploading ? t("loading") : t("upload")}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <Card key={img.id}>
            <CardContent className="space-y-3 pt-4">
              <Image src={img.imageUrl} alt={img.title} width={200} height={200} className="mx-auto rounded" unoptimized />
              <p className="font-medium">{img.title}</p>
              <p className="text-xs text-muted-foreground">{img.type}</p>
              <div className="flex items-center gap-2">
                <Switch checked={img.isVisible} onCheckedChange={() => toggleVisibility(img)} />
                <span className="text-sm">{img.isVisible ? t("visible") : t("hide")}</span>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(img.id)}>{t("delete")}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
