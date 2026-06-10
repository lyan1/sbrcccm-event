"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export interface FamilyOption {
  id: string;
  displayName: string;
}

interface FamilyPickerProps {
  value: string;
  selectedLabel?: string;
  onChange: (family: FamilyOption | null) => void;
}

export function FamilyPicker({ value, selectedLabel, onChange }: FamilyPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [storedLabel, setStoredLabel] = useState<string | undefined>(selectedLabel);

  const fetchFamilies = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/families?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setFamilies([]);
        return;
      }
      const data = await res.json();
      setFamilies(Array.isArray(data) ? data : []);
    } catch {
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setFamilies([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => fetchFamilies(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query, fetchFamilies]);

  const selectedName =
    families.find((f) => f.id === value)?.displayName ?? storedLabel ?? selectedLabel;

  return (
    <div className="space-y-2">
      <Input
        placeholder={t("searchFamilyPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {value && selectedName && (
        <p className="text-sm text-muted-foreground">
          {t("selectedFamily")}: <span className="font-medium text-foreground">{selectedName}</span>
        </p>
      )}
      {query.trim().length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border">
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">{t("loading")}</p>
          ) : families.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            families.map((family) => (
              <button
                key={family.id}
                type="button"
                onClick={() => {
                  setStoredLabel(family.displayName);
                  onChange(family);
                }}
                className={`flex w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                  value === family.id ? "bg-accent font-medium" : ""
                }`}
              >
                {family.displayName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
