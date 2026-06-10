"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CountInput } from "@/components/count-input";
import { Label } from "@/components/ui/label";
import { parseCount } from "@/lib/count-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberAccountPicker } from "@/components/member-account-picker";
import { useI18n } from "@/lib/i18n";
import { setSelectedMember } from "@/lib/member-storage";

interface RegisterSomeoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSuccess: () => void;
}

export function RegisterSomeoneDialog({
  open,
  onOpenChange,
  eventId,
  onSuccess,
}: RegisterSomeoneDialogProps) {
  const { t } = useI18n();
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [count, setCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) {
      setError(t("noAccountSelected"));
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/registrations/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberAccountId: memberId,
        items: [{ eventId, participantCount: parseCount(count, 1) }],
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("error"));
      setSubmitting(false);
      return;
    }

    setSelectedMember({ id: memberId, displayName: memberName });
    setSubmitting(false);
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("register")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <MemberAccountPicker
            value={memberId}
            onChange={(m) => {
              setMemberId(m.id);
              setMemberName(m.displayName);
            }}
          />
          <div>
            <Label>{t("participantCount")}</Label>
            <CountInput
              value={count}
              onChange={setCount}
              className="mt-1 w-24"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("loading") : t("submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
