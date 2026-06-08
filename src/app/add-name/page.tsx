"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { setSelectedMember } from "@/lib/member-storage";

export default function AddNamePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function checkDuplicate(name: string) {
    const res = await fetch(`/api/member-accounts?q=${encodeURIComponent(name)}`);
    const data = await res.json();
    const exact = data.some(
      (a: { displayName: string }) =>
        a.displayName.toLowerCase() === name.toLowerCase()
    );
    setWarning(exact ? t("duplicateNameWarning") : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/member-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName.trim(),
        phone: phone || undefined,
        email: email || undefined,
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      setError(t("error"));
      setSubmitting(false);
      return;
    }

    const account = await res.json();
    setSelectedMember({ id: account.id, displayName: account.displayName });
    router.push("/");
  }

  return (
    <PublicLayout>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← {t("home")}</Link>
        </Button>

        <h1 className="text-xl font-bold">{t("addNameTitle")}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="displayName">{t("displayName")} *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (e.target.value.trim()) checkDuplicate(e.target.value.trim());
              }}
              required
              className="mt-1"
            />
            {warning && <p className="mt-1 text-sm text-amber-600">{warning}</p>}
          </div>

          <div>
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t("loading") : t("submit")}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
