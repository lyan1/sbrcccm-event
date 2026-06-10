"use client";

import { useEffect, useState } from "react";
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
import { useI18n } from "@/lib/i18n";

interface EditRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: {
    id: string;
    displayName: string;
    registeredParticipantCount: number;
  } | null;
  onSuccess: () => void;
}

export function EditRegistrationDialog({
  open,
  onOpenChange,
  registration,
  onSuccess,
}: EditRegistrationDialogProps) {
  const { t } = useI18n();
  const [count, setCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (registration) setCount(String(registration.registeredParticipantCount));
  }, [registration]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!registration) return;
    setSubmitting(true);

    const res = await fetch(`/api/registrations/${registration.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registeredParticipantCount: parseCount(count, 1) }),
    });

    setSubmitting(false);
    if (res.ok) {
      onOpenChange(false);
      onSuccess();
    }
  }

  async function handleCancel() {
    if (!registration) return;
    if (!confirm(t("confirmCancel"))) return;
    setSubmitting(true);

    const res = await fetch(`/api/registrations/${registration.id}/cancel`, {
      method: "POST",
    });

    setSubmitting(false);
    if (res.ok) {
      onOpenChange(false);
      onSuccess();
    }
  }

  if (!registration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("modify")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <p className="font-medium">{registration.displayName}</p>
          <div>
            <Label>{t("participantCount")}</Label>
            <CountInput
              value={count}
              onChange={setCount}
              className="mt-1 w-24"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{t("save")}</Button>
            <Button type="button" variant="destructive" onClick={handleCancel} disabled={submitting}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
