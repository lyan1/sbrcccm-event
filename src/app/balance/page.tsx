"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicLayout } from "@/components/public-layout";
import { MemberAccountPicker } from "@/components/member-account-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { formatCents, formatDate } from "@/lib/utils";
import { getSelectedMember, setSelectedMember } from "@/lib/member-storage";

interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  eventTitle?: string;
  eventDate?: string;
  paymentMethod?: string;
  description?: string;
  createdAt: string;
}

export default function BalancePage() {
  const { t, language, tNested } = useI18n();
  const locale = language === "zh" ? "zh-CN" : "en-US";

  const [memberId, setMemberId] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [range, setRange] = useState("3m");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = getSelectedMember();
    if (stored) setMemberId(stored.id);
  }, []);

  useEffect(() => {
    if (!memberId) {
      setBalance(null);
      setTransactions([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/member-accounts/${encodeURIComponent(memberId)}/balance`).then((r) => r.json()),
      fetch(`/api/member-accounts/${encodeURIComponent(memberId)}/transactions?range=${range}`).then((r) => r.json()),
    ]).then(([bal, txns]) => {
      setBalance(bal.balanceCents);
      setTransactions(txns);
      setLoading(false);
    });
  }, [memberId, range]);

  return (
    <PublicLayout>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← {t("home")}</Link>
        </Button>

        <h1 className="text-xl font-bold">{t("balance")}</h1>

        <Card className="p-4">
          <MemberAccountPicker
            value={memberId}
            onChange={(m) => {
              setMemberId(m.id);
              setSelectedMember(m);
            }}
          />
        </Card>

        {!memberId ? (
          <p className="text-muted-foreground">{t("noAccountSelected")}</p>
        ) : loading ? (
          <p>{t("loading")}</p>
        ) : (
          <>
            <div className="rounded-lg border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">{t("currentBalance")}</p>
              <p
                className={`text-3xl font-bold ${(balance ?? 0) < 0 ? "text-destructive" : "text-green-700"}`}
              >
                {formatCents(balance ?? 0, locale)}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t("transactionHistory")}</h2>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">{t("range3m")}</SelectItem>
                  <SelectItem value="6m">{t("range6m")}</SelectItem>
                  <SelectItem value="12m">{t("range12m")}</SelectItem>
                  <SelectItem value="all">{t("rangeAll")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {transactions.length === 0 ? (
              <p className="text-muted-foreground">{t("noTransactions")}</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <Card key={txn.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{tNested(`transactionTypes.${txn.type}`)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(txn.createdAt, locale)}
                          </p>
                          {txn.eventTitle && (
                            <p className="text-sm text-muted-foreground">
                              {txn.eventTitle}
                              {txn.eventDate && ` · ${formatDate(txn.eventDate, locale)}`}
                            </p>
                          )}
                          {txn.description && (
                            <p className="text-sm">{txn.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${txn.amountCents < 0 ? "text-destructive" : "text-green-700"}`}
                          >
                            {formatCents(txn.amountCents, locale)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("balanceAfter")}: {formatCents(txn.balanceAfterCents, locale)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
