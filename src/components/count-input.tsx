"use client";

import { Input } from "@/components/ui/input";
import { normalizeCountDraft } from "@/lib/count-input";
import { cn } from "@/lib/utils";

interface CountInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  min?: number;
}

export function CountInput({
  value,
  onChange,
  min = 1,
  className,
  onBlur,
  ...props
}: CountInputProps) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        if (next !== "" && !/^\d+$/.test(next)) return;
        onChange(next);
      }}
      onBlur={(e) => {
        onChange(normalizeCountDraft(value, min));
        onBlur?.(e);
      }}
      className={cn(className)}
      {...props}
    />
  );
}
