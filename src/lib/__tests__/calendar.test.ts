import { describe, expect, it } from "vitest";
import {
  buildDateMarkers,
  getEventDisplayStatus,
  isPastEventDate,
  isRegistrationOpen,
  monthRange,
  todayDateKey,
} from "../calendar";

describe("buildDateMarkers", () => {
  it("counts open events per date", () => {
    const markers = buildDateMarkers([
      {
        id: "1",
        title: "A",
        eventDate: "2026-06-20",
        startTime: "18:00",
        endTime: "20:00",
        locationName: null,
        status: "OPEN",
        registeredParticipantCount: 2,
        registrationCount: 1,
      },
      {
        id: "2",
        title: "B",
        eventDate: "2026-06-20",
        startTime: "09:00",
        endTime: "11:00",
        locationName: null,
        status: "OPEN",
        registeredParticipantCount: 1,
        registrationCount: 1,
      },
    ]);

    expect(markers.get("2026-06-20")?.openCount).toBe(2);
  });
});

describe("isPastEventDate", () => {
  it("returns true for dates before today", () => {
    const today = todayDateKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
    const d = String(yesterday.getDate()).padStart(2, "0");
    expect(isPastEventDate(`${y}-${m}-${d}`)).toBe(true);
    expect(isPastEventDate(today)).toBe(false);
  });
});

describe("getEventDisplayStatus", () => {
  it("shows CLOSED for past open events", () => {
    expect(getEventDisplayStatus("OPEN", "2020-01-01")).toBe("CLOSED");
  });

  it("keeps OPEN for future open events", () => {
    expect(getEventDisplayStatus("OPEN", "2099-12-31")).toBe("OPEN");
  });
});

describe("isRegistrationOpen", () => {
  it("is false for past open events", () => {
    expect(isRegistrationOpen("OPEN", "2020-01-01")).toBe(false);
  });

  it("is true for future open events", () => {
    expect(isRegistrationOpen("OPEN", "2099-12-31")).toBe(true);
  });

  it("is false for completed events", () => {
    expect(isRegistrationOpen("COMPLETED", "2099-12-31")).toBe(false);
  });
});

describe("monthRange", () => {
  it("returns first and last day of month", () => {
    const { from, to } = monthRange(2026, 5); // June
    expect(from).toBe("2026-06-01");
    expect(to).toBe("2026-06-30");
  });
});
