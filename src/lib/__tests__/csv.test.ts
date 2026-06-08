import { describe, expect, it } from "vitest";
import { buildBalanceSnapshotCsv, escapeCsvField } from "../csv";

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
    expect(csv).toContain("-1250");
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
