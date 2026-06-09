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

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}

export type MemberImportErrorCode =
  | "EMPTY_NAME"
  | "NAME_TOO_LONG"
  | "INVALID_BALANCE"
  | "WRONG_COLUMN_COUNT";

export type ParsedMemberImportLine =
  | { line: number; kind: "row"; displayName: string; balanceCents: number }
  | { line: number; kind: "error"; reason: MemberImportErrorCode; displayName?: string };

export function parseBalanceDollars(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * 100);
}

export function parseMemberImportCsv(text: string): ParsedMemberImportLine[] {
  const normalized = text.replace(/^\uFEFF/, "");
  const rawLines = normalized.split(/\r?\n/);
  const results: ParsedMemberImportLine[] = [];

  for (let index = 0; index < rawLines.length; index++) {
    const lineNumber = index + 1;
    const line = rawLines[index];
    if (!line.trim()) continue;

    const fields = parseCsvLine(line).map((field) => field.trim());
    if (fields.length !== 2) {
      results.push({ line: lineNumber, kind: "error", reason: "WRONG_COLUMN_COUNT" });
      continue;
    }

    const [nameField, balanceField] = fields;
    const displayName = nameField.trim();
    if (!displayName) {
      results.push({ line: lineNumber, kind: "error", reason: "EMPTY_NAME" });
      continue;
    }
    if (displayName.length > 200) {
      results.push({ line: lineNumber, kind: "error", reason: "NAME_TOO_LONG", displayName });
      continue;
    }

    const balanceCents = parseBalanceDollars(balanceField);
    if (balanceCents === null) {
      results.push({
        line: lineNumber,
        kind: "error",
        reason: "INVALID_BALANCE",
        displayName,
      });
      continue;
    }

    results.push({ line: lineNumber, kind: "row", displayName, balanceCents });
  }

  return results;
}
