"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { formatCents, formatDate } from "@/lib/utils";

interface FamilyRow {
  id: string;
  displayName: string;
  balanceCents: number;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

export default function AdminFamiliesPage() {
  const { t } = useI18n();
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [negativeOnly, setNegativeOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (isActive !== "all") params.set("isActive", isActive);
    if (negativeOnly) params.set("negativeBalanceOnly", "true");
    fetch(`/api/admin/families?${params}`)
      .then((r) => r.json())
      .then(setFamilies);
  }

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [q, isActive, negativeOnly]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: newName }),
    });
    setNewName("");
    setShowCreate(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{t("families")}</h1>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>{t("create")}</Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("familyName")}
            required
          />
          <Button type="submit">{t("save")}</Button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t("searchFamilyPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={isActive} onValueChange={setIsActive}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="true">{t("active")}</SelectItem>
            <SelectItem value="false">{t("inactive")}</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={negativeOnly} onChange={(e) => setNegativeOnly(e.target.checked)} />
          {t("filterNegativeBalance")}
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">{t("familyName")}</th>
              <th className="p-3 text-right">{t("balance")}</th>
              <th className="p-3 text-right">{t("memberCount")}</th>
              <th className="p-3 text-left">{t("phone")}</th>
              <th className="p-3 text-left">{t("status")}</th>
              <th className="p-3 text-left">{t("createdAt")}</th>
              <th className="p-3 text-left">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {families.map((family) => (
              <tr key={family.id} className="border-t">
                <td className="p-3">{family.displayName}</td>
                <td className={`p-3 text-right ${family.balanceCents < 0 ? "text-destructive" : ""}`}>
                  {formatCents(family.balanceCents)}
                </td>
                <td className="p-3 text-right">{family.memberCount}</td>
                <td className="p-3">{family.phone ?? "—"}</td>
                <td className="p-3">{family.isActive ? t("active") : t("inactive")}</td>
                <td className="p-3">{formatDate(family.createdAt)}</td>
                <td className="p-3">
                  <Link href={`/admin/families/${family.id}`} className="text-primary hover:underline">
                    {t("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
