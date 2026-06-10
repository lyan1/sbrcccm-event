"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function AdminFamilyDetailPage() {
  const { t, tNested } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [deleteError, setDeleteError] = useState("");
  const [family, setFamily] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", phone: "", email: "", notes: "" });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ZELLE");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberCandidates, setMemberCandidates] = useState<Array<{ id: string; displayName: string }>>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState("");

  function load() {
    fetch(`/api/admin/families/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setFamily(data);
        setForm({
          displayName: data.displayName,
          phone: data.phone ?? "",
          email: data.email ?? "",
          notes: data.notes ?? "",
        });
      });
  }

  useEffect(() => { load(); }, [id]);

  const fetchUnassignedMembers = useCallback(async (query: string) => {
    setMemberSearchLoading(true);
    try {
      const params = new URLSearchParams({
        unassignedOnly: "true",
        isActive: "true",
        q: query,
      });
      const res = await fetch(`/api/admin/member-accounts?${params}`);
      const data = await res.json();
      setMemberCandidates(Array.isArray(data) ? data : []);
    } catch {
      setMemberCandidates([]);
    } finally {
      setMemberSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = memberSearch.trim();
    if (trimmed.length === 0) {
      setMemberCandidates([]);
      setMemberSearchLoading(false);
      return;
    }
    const timer = setTimeout(() => fetchUnassignedMembers(trimmed), 300);
    return () => clearTimeout(timer);
  }, [memberSearch, fetchUnassignedMembers]);

  async function handleAddMember(memberAccountId: string) {
    setMemberActionError("");
    const res = await fetch(`/api/admin/member-accounts/${memberAccountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: id }),
    });
    if (!res.ok) {
      setMemberActionError(t("error"));
      return;
    }
    setMemberSearch("");
    setMemberCandidates([]);
    load();
  }

  async function handleRemoveMember(memberAccountId: string) {
    if (!confirm(t("confirmRemoveFromFamily"))) return;
    setMemberActionError("");
    const res = await fetch(`/api/admin/member-accounts/${memberAccountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: null }),
    });
    if (!res.ok) {
      setMemberActionError(t("error"));
      return;
    }
    load();
  }

  async function handleSave() {
    await fetch(`/api/admin/families/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    load();
  }

  async function toggleActive() {
    const isActive = !(family as { isActive: boolean }).isActive;
    await fetch(`/api/admin/families/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    load();
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(paymentAmount);
    if (isNaN(dollars) || dollars <= 0) return;
    await fetch(`/api/admin/families/${id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: Math.round(dollars * 100),
        paymentMethod,
      }),
    });
    setPaymentAmount("");
    load();
  }

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(adjustAmount);
    if (isNaN(dollars) || !adjustDesc) return;
    await fetch(`/api/admin/families/${id}/adjustment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: Math.round(dollars * 100),
        description: adjustDesc,
      }),
    });
    setAdjustAmount("");
    setAdjustDesc("");
    load();
  }

  async function handleDelete() {
    if (!confirm(t("confirmDeleteFamily"))) return;
    setDeleteError("");
    const res = await fetch(`/api/admin/families/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(
        data.error === "FAMILY_DELETE_BLOCKED" ? t("deleteFamilyBlocked") : t("error")
      );
      return;
    }
    router.push("/admin/families");
  }

  if (!family) return <p>{t("loading")}</p>;

  const fam = family as {
    displayName: string;
    balanceCents: number;
    isActive: boolean;
    members: Array<{ id: string; displayName: string; isActive: boolean }>;
    transactions: Array<{
      id: string;
      type: string;
      amountCents: number;
      balanceAfterCents: number;
      description: string | null;
      createdAt: string;
      memberAccount: { displayName: string };
      event: { title: string; eventDate: string } | null;
    }>;
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/families">← {t("families")}</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{fam.displayName}</h1>
          <p className={`text-2xl font-bold ${fam.balanceCents < 0 ? "text-destructive" : "text-green-700"}`}>
            {formatCents(fam.balanceCents)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(!editing)}>{t("edit")}</Button>
          <Button variant="outline" onClick={toggleActive}>
            {fam.isActive ? t("deactivate") : t("reactivate")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>{t("delete")}</Button>
        </div>
      </div>

      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {editing && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div><Label>{t("familyName")}</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
            <div><Label>{t("phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>{t("email")}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave}>{t("save")}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("familyMembers")}</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {fam.members.length === 0 ? (
            <p className="text-muted-foreground">{t("noResults")}</p>
          ) : (
            <ul className="space-y-2">
              {fam.members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/members/${member.id}`} className="hover:underline">
                    {member.displayName} {!member.isActive && `(${t("inactive")})`}
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    {t("removeFromFamily")}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t pt-4">
            <Label>{t("addMemberToFamily")}</Label>
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder={t("searchUnassignedMemberPlaceholder")}
            />
            {memberSearch.trim().length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {memberSearchLoading ? (
                  <p className="p-3 text-muted-foreground">{t("loading")}</p>
                ) : memberCandidates.length === 0 ? (
                  <p className="p-3 text-muted-foreground">{t("noResults")}</p>
                ) : (
                  memberCandidates.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleAddMember(member.id)}
                      className="flex w-full px-3 py-2 text-left hover:bg-accent"
                    >
                      {member.displayName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {memberActionError && (
            <p className="text-sm text-destructive">{memberActionError}</p>
          )}
        </CardContent>
      </Card>

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
              <Button type="submit">{t("submit")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("description")} (Adjustment)</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdjustment} className="space-y-3">
              <Input type="number" step="0.01" placeholder="Amount ($, +/-)" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} required />
              <Input placeholder={t("description")} value={adjustDesc} onChange={(e) => setAdjustDesc(e.target.value)} required />
              <Button type="submit">{t("submit")}</Button>
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
              <th className="p-2 text-left">{t("member")}</th>
              <th className="p-2 text-left">{t("type")}</th>
              <th className="p-2 text-right">{t("amount")}</th>
              <th className="p-2 text-right">{t("balanceAfter")}</th>
            </tr></thead>
            <tbody>
              {fam.transactions.map((txn) => (
                <tr key={txn.id} className="border-b">
                  <td className="p-2">{formatDate(txn.createdAt)}</td>
                  <td className="p-2">{txn.memberAccount.displayName}</td>
                  <td className="p-2">{tNested(`transactionTypes.${txn.type}`)}</td>
                  <td className={`p-2 text-right ${txn.amountCents < 0 ? "text-destructive" : ""}`}>{formatCents(txn.amountCents)}</td>
                  <td className="p-2 text-right">{formatCents(txn.balanceAfterCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
