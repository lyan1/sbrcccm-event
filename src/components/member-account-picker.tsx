"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getSelectedMember } from "@/lib/member-storage";

export interface MemberOption {
  id: string;
  displayName: string;
}

interface MemberAccountPickerProps {
  value: string;
  selectedLabel?: string;
  onChange: (member: MemberOption) => void;
  useStoredDefault?: boolean;
}

export function MemberAccountPicker({
  value,
  selectedLabel,
  onChange,
  useStoredDefault = true,
}: MemberAccountPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [storedLabel, setStoredLabel] = useState<string | undefined>(selectedLabel);

  const fetchAccounts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/member-accounts?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setAccounts([]);
        return;
      }
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => fetchAccounts(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query, fetchAccounts]);

  useEffect(() => {
    if (!useStoredDefault || value) return;
    const stored = getSelectedMember();
    if (stored) {
      setStoredLabel(stored.displayName);
      onChange(stored);
    }
  }, [useStoredDefault, value, onChange]);

  const selectedName =
    accounts.find((a) => a.id === value)?.displayName ?? storedLabel ?? selectedLabel;

  return (
    <div className="space-y-2">
      <Input
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {value && selectedName && (
        <p className="text-sm text-muted-foreground">
          {t("currentlySelected")}: <span className="font-medium text-foreground">{selectedName}</span>
        </p>
      )}
      {query.trim().length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border">
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">{t("loading")}</p>
          ) : accounts.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  setStoredLabel(account.displayName);
                  onChange(account);
                }}
                className={`flex w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                  value === account.id ? "bg-accent font-medium" : ""
                }`}
              >
                {account.displayName}
              </button>
            ))
          )}
        </div>
      )}
      <Button asChild variant="link" className="h-auto p-0">
        <Link href="/add-name">{t("addNewName")}</Link>
      </Button>
    </div>
  );
}
