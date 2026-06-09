import { describe, expect, it } from "vitest";
import {
  buildBalanceSnapshotCsv,
  escapeCsvField,
  parseBalanceDollars,
  parseCsvLine,
  parseMemberImportCsv,
} from "../csv";

describe("escapeCsvField", () => {
  it("quotes fields with commas", () => {
    expect(escapeCsvField("John, Mary")).toBe('"John, Mary"');
  });

  it("escapes double quotes", () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
  });
});

describe("buildBalanceSnapshotCsv", () => {
  it("includes UTF-8 BOM and Chinese names", () => {
    const csv = buildBalanceSnapshotCsv({
      snapshotTimestamp: new Date("2026-06-20T21:15:00Z"),
      eventId: "event_1",
      eventDate: new Date("2026-06-20T00:00:00Z"),
      accounts: [
        {
          id: "m1",
          displayName: "张三家庭",
          balanceCents: -1250,
          phone: null,
          email: null,
          isActive: true,
        },
      ],
    });

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("张三家庭");
    expect(csv).toContain("-12.50");
    const header = csv.replace(/^\uFEFF/, "").split("\n")[0];
    expect(header).toBe("Member / Family Name,Balance,Phone");
  });

  it("sorts by display name", () => {
    const csv = buildBalanceSnapshotCsv({
      snapshotTimestamp: new Date(),
      eventId: null,
      eventDate: null,
      accounts: [
        { id: "2", displayName: "Zebra", balanceCents: 0, phone: null, email: null, isActive: true },
        { id: "1", displayName: "Alice", balanceCents: 0, phone: null, email: null, isActive: true },
      ],
    });
    const aliceIdx = csv.indexOf("Alice");
    const zebraIdx = csv.indexOf("Zebra");
    expect(aliceIdx).toBeLessThan(zebraIdx);
  });
});

describe("parseCsvLine", () => {
  it("parses quoted fields with commas", () => {
    expect(parseCsvLine('"John, Mary",50.00')).toEqual(["John, Mary", "50.00"]);
  });
});

describe("parseBalanceDollars", () => {
  it("converts dollars to cents", () => {
    expect(parseBalanceDollars("12.50")).toBe(1250);
    expect(parseBalanceDollars("-12.50")).toBe(-1250);
    expect(parseBalanceDollars("0")).toBe(0);
  });

  it("rejects invalid values", () => {
    expect(parseBalanceDollars("")).toBeNull();
    expect(parseBalanceDollars("abc")).toBeNull();
  });
});

describe("parseMemberImportCsv", () => {
  it("parses rows without header", () => {
    const rows = parseMemberImportCsv("张三家庭,50.00\nJohn,-12.50");
    expect(rows).toEqual([
      { line: 1, kind: "row", displayName: "张三家庭", balanceCents: 5000 },
      { line: 2, kind: "row", displayName: "John", balanceCents: -1250 },
    ]);
  });

  it("skips blank lines", () => {
    const rows = parseMemberImportCsv("Alice,1.00\n\nBob,2.00");
    expect(rows).toHaveLength(2);
  });

  it("reports invalid balance", () => {
    const rows = parseMemberImportCsv("Alice,not-a-number");
    expect(rows[0]).toEqual({
      line: 1,
      kind: "error",
      reason: "INVALID_BALANCE",
      displayName: "Alice",
    });
  });

  it("reports wrong column count", () => {
    const rows = parseMemberImportCsv("Alice");
    expect(rows[0]).toEqual({ line: 1, kind: "error", reason: "WRONG_COLUMN_COUNT" });
  });

  it("strips UTF-8 BOM", () => {
    const rows = parseMemberImportCsv("\uFEFFAlice,1.00");
    expect(rows[0]).toMatchObject({ kind: "row", displayName: "Alice" });
  });
});
