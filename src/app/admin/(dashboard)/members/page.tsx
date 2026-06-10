"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { formatCents, formatDate } from "@/lib/utils";

interface Member {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  balanceCents: number;
  isActive: boolean;
  createdAt: string;
  family: { id: string; displayName: string } | null;
}

type ImportResult =
  | { line: number; status: "created"; displayName: string; id: string; balanceCents: number }
  | { line: number; status: "skipped"; displayName: string; reason: string }
  | { line: number; status: "error"; reason: string; displayName?: string };

export default function AdminMembersPage() {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [negativeOnly, setNegativeOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<{ created: number; skipped: number; errors: number } | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (isActive !== "all") params.set("isActive", isActive);
    if (negativeOnly) params.set("negativeBalanceOnly", "true");
    fetch(`/api/admin/member-accounts?${params}`)
      .then((r) => r.json())
      .then(setMembers);
  }

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [q, isActive, negativeOnly]);

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDeleteMember"))) return;
    setError("");
    const res = await fetch(`/api/admin/member-accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "MEMBER_DELETE_BLOCKED" ? t("deleteMemberBlocked") : t("error")
      );
      return;
    }
    load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/member-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: newName }),
    });
    setNewName("");
    setShowCreate(false);
    load();
  }

  function importReasonLabel(reason: string) {
    switch (reason) {
      case "MEMBER_EXISTS":
        return t("importCsvReason_MEMBER_EXISTS");
      case "FAMILY_EXISTS":
        return t("importCsvReason_FAMILY_EXISTS");
      case "DUPLICATE_NAMES":
        return t("importCsvReason_DUPLICATE_NAMES");
      case "EMPTY_NAME":
        return t("importCsvReason_EMPTY_NAME");
      case "NAME_TOO_LONG":
        return t("importCsvReason_NAME_TOO_LONG");
      case "INVALID_BALANCE":
        return t("importCsvReason_INVALID_BALANCE");
      case "WRONG_COLUMN_COUNT":
        return t("importCsvReason_WRONG_COLUMN_COUNT");
      default:
        return reason;
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;

    setImportLoading(true);
    setError("");
    setImportSummary(null);
    setImportResults([]);

    const formData = new FormData();
    formData.append("file", importFile);

    const res = await fetch("/api/admin/member-accounts/import-csv", {
      method: "POST",
      body: formData,
    });

    setImportLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "EMPTY_FILE" ? t("importCsvEmptyFile") : t("importCsvFailed"));
      return;
    }

    const data = await res.json();
    setImportSummary(data.summary);
    setImportResults(data.results);
    setImportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{t("members")}</h1>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>{t("create")}</Button>
        <Button size="sm" variant="outline" onClick={() => setShowImport(!showImport)}>
          {t("importFromCsv")}
        </Button>
      </div>

      {showImport && (
        <form onSubmit={handleImport} className="space-y-3 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t("importCsvHint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={!importFile || importLoading}>
              {t("importCsvSubmit")}
            </Button>
          </div>
          {importSummary && (
            <p className="text-sm">
              {t("importCsvSummary")
                .replace("{created}", String(importSummary.created))
                .replace("{skipped}", String(importSummary.skipped))
                .replace("{errors}", String(importSummary.errors))}
            </p>
          )}
          {importResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded border text-sm">
              <table className="w-full">
                <tbody>
                  {importResults.map((result) => (
                    <tr key={result.line} className="border-t first:border-t-0">
                      <td className="p-2 whitespace-nowrap">
                        {t("importCsvLine").replace("{line}", String(result.line))}
                      </td>
                      <td className="p-2">{result.displayName ?? "—"}</td>
                      <td className="p-2">
                        {result.status === "created" && (
                          <span>{t("importCsvCreated")} ({formatCents(result.balanceCents)})</span>
                        )}
                        {result.status === "skipped" && (
                          <span>{t("importCsvSkipped")}: {importReasonLabel(result.reason)}</span>
                        )}
                        {result.status === "error" && (
                          <span className="text-destructive">
                            {t("importCsvError")}: {importReasonLabel(result.reason)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </form>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("displayName")} required />
          <Button type="submit">{t("save")}</Button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <Input placeholder={t("searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">{t("displayName")}</th>
              <th className="p-3 text-left">{t("family")}</th>
              <th className="p-3 text-left">{t("phone")}</th>
              <th className="p-3 text-left">{t("email")}</th>
              <th className="p-3 text-right">{t("balance")}</th>
              <th className="p-3 text-left">{t("status")}</th>
              <th className="p-3 text-left">{t("createdAt")}</th>
              <th className="p-3 text-left">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-3">{m.displayName}</td>
                <td className="p-3">
                  {m.family ? (
                    <Link href={`/admin/families/${m.family.id}`} className="text-primary hover:underline">
                      {m.family.displayName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">{m.phone ?? "—"}</td>
                <td className="p-3">{m.email ?? "—"}</td>
                <td className={`p-3 text-right ${m.balanceCents < 0 ? "text-destructive" : ""}`}>
                  {formatCents(m.balanceCents)}
                </td>
                <td className="p-3">{m.isActive ? t("active") : t("inactive")}</td>
                <td className="p-3">{formatDate(m.createdAt)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/members/${m.id}`} className="text-primary hover:underline">{t("edit")}</Link>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(m.id)}>
                      {t("delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
