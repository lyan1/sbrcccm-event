"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { formatCents, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  paymentMethod: string | null;
  description: string | null;
  createdAt: string;
  memberAccount: { displayName: string };
  event: { title: string; eventDate: string } | null;
  createdByAdmin: { username: string } | null;
}

export default function AdminTransactionsPage() {
  const { t, tNested } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    type: "all",
    paymentMethod: "all",
    negativeBalanceOnly: false,
  });

  function buildParams() {
    const p = new URLSearchParams();
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    if (filters.type !== "all") p.set("type", filters.type);
    if (filters.paymentMethod !== "all") p.set("paymentMethod", filters.paymentMethod);
    if (filters.negativeBalanceOnly) p.set("negativeBalanceOnly", "true");
    return p.toString();
  }

  function load() {
    fetch(`/api/admin/transactions?${buildParams()}`)
      .then((r) => r.json())
      .then(setTransactions);
  }

  useEffect(() => { load(); }, []);

  function handleExport() {
    window.open(`/api/admin/transactions/export.csv?${buildParams()}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("transactions")}</h1>

      <div className="flex flex-wrap gap-2">
        <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t("type")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {["PAYMENT", "GAME_FEE", "MANUAL_ADJUSTMENT", "REFUND", "REVERSAL"].map((type) => (
              <SelectItem key={type} value={type}>{tNested(`transactionTypes.${type}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.negativeBalanceOnly}
            onChange={(e) => setFilters({ ...filters, negativeBalanceOnly: e.target.checked })}
          />
          {t("filterNegativeBalance")}
        </label>
        <Button onClick={load}>{t("search")}</Button>
        <Button variant="outline" onClick={() => setFilters({ from: "", to: "", type: "all", paymentMethod: "all", negativeBalanceOnly: false })}>
          {t("resetFilters")}
        </Button>
        <Button variant="outline" onClick={handleExport}>{t("exportCsv")}</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">{t("date")}</th>
              <th className="p-3 text-left">{t("member")}</th>
              <th className="p-3 text-left">{t("type")}</th>
              <th className="p-3 text-right">{t("amount")}</th>
              <th className="p-3 text-right">{t("balanceAfter")}</th>
              <th className="p-3 text-left">{t("event")}</th>
              <th className="p-3 text-left">{t("description")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} className="border-t">
                <td className="p-3">{formatDate(txn.createdAt)}</td>
                <td className="p-3">{txn.memberAccount.displayName}</td>
                <td className="p-3">{tNested(`transactionTypes.${txn.type}`)}</td>
                <td className={`p-3 text-right ${txn.amountCents < 0 ? "text-destructive" : ""}`}>
                  {formatCents(txn.amountCents)}
                </td>
                <td className="p-3 text-right">{formatCents(txn.balanceAfterCents)}</td>
                <td className="p-3">
                  {txn.event ? `${txn.event.title} (${formatDate(txn.event.eventDate)})` : "—"}
                </td>
                <td className="p-3">{txn.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
