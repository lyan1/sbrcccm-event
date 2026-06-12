"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { formatCents, formatDate } from "@/lib/utils";

export default function AdminMemberDetailPage() {
  const { t, tNested } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [deleteError, setDeleteError] = useState("");
  const [message, setMessage] = useState("");

  const [account, setAccount] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", phone: "", email: "", notes: "" });
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [families, setFamilies] = useState<Array<{ id: string; displayName: string }>>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ZELLE");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustFeedback, setAdjustFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function load() {
    fetch(`/api/admin/member-accounts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAccount(data);
        setForm({
          displayName: data.displayName,
          phone: data.phone ?? "",
          email: data.email ?? "",
          notes: data.notes ?? "",
        });
        setFamilyId(data.family?.id ?? null);
      });
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!editing) return;
    fetch("/api/admin/families?isActive=true")
      .then((r) => r.json())
      .then((data) => setFamilies(Array.isArray(data) ? data : []));
  }, [editing]);

  async function handleSave() {
    await fetch(`/api/admin/member-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, familyId }),
    });
    setEditing(false);
    load();
  }

  async function toggleActive() {
    const isActive = !(account as { isActive: boolean }).isActive;
    setMessage("");
    const res = await fetch(`/api/admin/member-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!isActive && data.cancelledRegistrationCount > 0) {
        setMessage(
          t("memberDeactivatedRegistrationsCancelled").replace(
            "{count}",
            String(data.cancelledRegistrationCount)
          )
        );
      }
    }
    load();
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentFeedback(null);
    const dollars = parseFloat(paymentAmount);
    if (isNaN(dollars) || dollars <= 0) {
      setPaymentFeedback({ type: "error", text: t("invalidPaymentAmount") });
      return;
    }
    setPaymentSubmitting(true);
    try {
      const res = await fetch(`/api/admin/member-accounts/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: Math.round(dollars * 100),
          paymentMethod,
        }),
      });
      if (!res.ok) {
        setPaymentFeedback({ type: "error", text: t("paymentFailed") });
        return;
      }
      setPaymentAmount("");
      setPaymentFeedback({ type: "success", text: t("paymentSuccess") });
      load();
    } catch {
      setPaymentFeedback({ type: "error", text: t("paymentFailed") });
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("confirmDeleteMember"))) return;
    setDeleteError("");
    const res = await fetch(`/api/admin/member-accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(
        data.error === "MEMBER_DELETE_BLOCKED" ? t("deleteMemberBlocked") : t("error")
      );
      return;
    }
    router.push("/admin/members");
  }

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    setAdjustFeedback(null);
    const dollars = parseFloat(adjustAmount);
    if (isNaN(dollars) || !adjustDesc) {
      setAdjustFeedback({ type: "error", text: t("error") });
      return;
    }
    setAdjustSubmitting(true);
    try {
      const res = await fetch(`/api/admin/member-accounts/${id}/adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: Math.round(dollars * 100),
          description: adjustDesc,
        }),
      });
      if (!res.ok) {
        setAdjustFeedback({ type: "error", text: t("adjustmentFailed") });
        return;
      }
      setAdjustAmount("");
      setAdjustDesc("");
      setAdjustFeedback({ type: "success", text: t("adjustmentSuccess") });
      load();
    } catch {
      setAdjustFeedback({ type: "error", text: t("adjustmentFailed") });
    } finally {
      setAdjustSubmitting(false);
    }
  }

  if (!account) return <p>{t("loading")}</p>;

  const acc = account as {
    displayName: string;
    balanceCents: number;
    isActive: boolean;
    family: { id: string; displayName: string } | null;
    transactions: Array<{
      memberAccount: { displayName: string };
      id: string;
      type: string;
      amountCents: number;
      balanceAfterCents: number;
      description: string | null;
      createdAt: string;
      event: { title: string; eventDate: string } | null;
    }>;
    registrations: Array<{
      id: string;
      registeredParticipantCount: number;
      status: string;
      event: { title: string; eventDate: string; status: string };
    }>;
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/members">← {t("members")}</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{acc.displayName}</h1>
          <p className={`text-2xl font-bold ${acc.balanceCents < 0 ? "text-destructive" : "text-green-700"}`}>
            {formatCents(acc.balanceCents)}
          </p>
          {acc.family && (
            <p className="text-sm text-muted-foreground">
              {t("family")}:{" "}
              <Link href={`/admin/families/${acc.family.id}`} className="text-primary hover:underline">
                {acc.family.displayName}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(!editing)}>{t("edit")}</Button>
          <Button variant="outline" onClick={toggleActive}>
            {acc.isActive ? t("deactivate") : t("reactivate")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>{t("delete")}</Button>
        </div>
      </div>

      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      {editing && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div><Label>{t("displayName")}</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
            <div><Label>{t("phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>{t("email")}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div>
              <Label>{t("assignFamily")}</Label>
              <Select
                value={familyId ?? "none"}
                onValueChange={(value) => setFamilyId(value === "none" ? null : value)}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noFamily")}</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>{family.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave}>{t("save")}</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("addPayment")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handlePayment} className="space-y-3">
              <Input type="number" step="0.01" min="0.01" placeholder="Amount ($)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ZELLE", "VENMO", "CASH", "CHECK", "OTHER"].map((m) => (
                    <SelectItem key={m} value={m}>{tNested(`paymentMethods.${m}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={paymentSubmitting}>
                {paymentSubmitting ? t("loading") : t("submit")}
              </Button>
              {paymentFeedback && (
                <p className={`text-sm ${paymentFeedback.type === "error" ? "text-destructive" : "text-green-700"}`}>
                  {paymentFeedback.text}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("description")} (Adjustment)</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdjustment} className="space-y-3">
              <Input type="number" step="0.01" placeholder="Amount ($, +/-)" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} required />
              <Input placeholder={t("description")} value={adjustDesc} onChange={(e) => setAdjustDesc(e.target.value)} required />
              <Button type="submit" disabled={adjustSubmitting}>
                {adjustSubmitting ? t("loading") : t("submit")}
              </Button>
              {adjustFeedback && (
                <p className={`text-sm ${adjustFeedback.type === "error" ? "text-destructive" : "text-green-700"}`}>
                  {adjustFeedback.text}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("transactionHistory")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="p-2 text-left">{t("date")}</th>
              {acc.family && <th className="p-2 text-left">{t("member")}</th>}
              <th className="p-2 text-left">{t("type")}</th>
              <th className="p-2 text-right">{t("amount")}</th>
              <th className="p-2 text-right">{t("balanceAfter")}</th>
            </tr></thead>
            <tbody>
              {acc.transactions.map((txn) => (
                <tr key={txn.id} className="border-b">
                  <td className="p-2">{formatDate(txn.createdAt)}</td>
                  {acc.family && <td className="p-2">{txn.memberAccount.displayName}</td>}
                  <td className="p-2">{tNested(`transactionTypes.${txn.type}`)}</td>
                  <td className={`p-2 text-right ${txn.amountCents < 0 ? "text-destructive" : ""}`}>{formatCents(txn.amountCents)}</td>
                  <td className="p-2 text-right">{formatCents(txn.balanceAfterCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("registrationHistory")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {acc.registrations.map((r) => (
            <p key={r.id}>
              {formatDate(r.event.eventDate)} · {r.event.title} · {r.registeredParticipantCount} · {tNested(`registrationStatus.${r.status}`)}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
