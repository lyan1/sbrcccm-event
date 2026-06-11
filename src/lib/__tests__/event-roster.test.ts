import { describe, expect, it } from "vitest";
import { canManageEventRoster } from "../event-roster";
import { parseDateTimeInTimezone } from "../timezone";

describe("canManageEventRoster", () => {
  const endedEvent = {
    status: "OPEN",
    eventDate: new Date("2026-06-20"),
    endTime: parseDateTimeInTimezone("2026-06-20", "20:00"),
  };

  it("allows roster edits after the event ends", () => {
    const now = parseDateTimeInTimezone("2026-06-20", "20:01");
    expect(canManageEventRoster(endedEvent, now)).toBe(true);
  });

  it("disallows roster edits before the event ends", () => {
    const now = parseDateTimeInTimezone("2026-06-20", "19:59");
    expect(canManageEventRoster(endedEvent, now)).toBe(false);
  });

  it("disallows roster edits for settled events", () => {
    const now = parseDateTimeInTimezone("2026-06-21", "12:00");
    expect(
      canManageEventRoster({ ...endedEvent, status: "COMPLETED" }, now)
    ).toBe(false);
  });

  it("disallows roster edits for cancelled events", () => {
    const now = parseDateTimeInTimezone("2026-06-21", "12:00");
    expect(
      canManageEventRoster({ ...endedEvent, status: "CANCELLED" }, now)
    ).toBe(false);
  });
});
