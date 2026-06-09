export function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatBalanceDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function buildBalanceSnapshotCsv(params: {
  snapshotTimestamp: Date;
  eventId: string | null;
  eventDate: Date | null;
  accounts: Array<{
    id: string;
    displayName: string;
    balanceCents: number;
    phone: string | null;
    email: string | null;
    isActive: boolean;
  }>;
  timezone?: string;
}): string {
  const header = ["Member / Family Name", "Balance", "Phone"].join(",");

  const sorted = [...params.accounts].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const rows = sorted.map((a) =>
    [
      escapeCsvField(a.displayName),
      formatBalanceDecimal(a.balanceCents),
      escapeCsvField(a.phone ?? ""),
    ].join(",")
  );

  // UTF-8 BOM for Excel + Chinese names
  return "\uFEFF" + [header, ...rows].join("\n");
}

export function balanceSnapshotFilename(eventDate: Date | null, now = new Date()): string {
  const datePart = eventDate
    ? eventDate.toISOString().slice(0, 10)
    : now.toISOString().slice(0, 10);
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `pickleball-balance-snapshot-${datePart}-${timePart}.csv`;
}

export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?([^";\n]+)"?/);
  return match?.[1] ?? null;
}
