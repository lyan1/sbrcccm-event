"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export interface EventLocationOption {
  id: string;
  name: string;
  address: string;
}

interface LocationFieldsProps {
  locations: EventLocationOption[];
  locationName: string;
  address: string;
  onLocationNameChange: (name: string) => void;
  onAddressChange: (address: string) => void;
  onLocationSelect: (name: string, address: string) => void;
  locationId?: string;
}

export function useEventLocations() {
  const [locations, setLocations] = useState<EventLocationOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/locations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLocations(data);
      })
      .catch(() => setLocations([]));
  }, []);

  return locations;
}

export function LocationFields({
  locations,
  locationName,
  address,
  onLocationNameChange,
  onAddressChange,
  onLocationSelect,
  locationId = "location",
}: LocationFieldsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const query = locationName.trim().toLowerCase();
    if (!query) return locations.slice(0, 8);
    return locations
      .filter((loc) => loc.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [locationName, locations]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectLocation(loc: EventLocationOption) {
    onLocationSelect(loc.name, loc.address);
    setOpen(false);
  }

  function handleLocationInput(value: string) {
    setOpen(true);
    setHighlighted(0);

    const exact = locations.find(
      (loc) => loc.name.toLowerCase() === value.trim().toLowerCase()
    );
    if (exact) {
      onLocationSelect(exact.name, exact.address);
      return;
    }

    onLocationNameChange(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      selectLocation(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <Label htmlFor={locationId}>{t("location")} *</Label>
        <Input
          id={locationId}
          value={locationName}
          onChange={(e) => handleLocationInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          required
        />
        {open && suggestions.length > 0 && (
          <ul
            className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md"
            role="listbox"
          >
            {suggestions.map((loc, i) => (
              <li key={loc.id} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                    i === highlighted && "bg-accent"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectLocation(loc)}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span className="font-medium">{loc.name}</span>
                  <span className="block text-xs text-muted-foreground">{loc.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <Label htmlFor={`${locationId}-address`}>{t("address")} *</Label>
        <Input
          id={`${locationId}-address`}
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          required
        />
      </div>
    </>
  );
}
