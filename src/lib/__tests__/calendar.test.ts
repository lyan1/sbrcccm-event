import { describe, expect, it } from "vitest";
import {
  buildDateMarkers,
  getAdminEventDisplayStatus,
  getEventDisplayStatus,
  isCalendarDateAvailable,
  isCalendarDateClosed,
  isEventEnded,
  isRegistrationOpen,
  monthRange,
  parseEventEnd,
} from "../calendar";
import { parseDateTimeInTimezone } from "../timezone";

describe("buildDateMarkers", () => {
  it("counts open events per date", () => {
    const markers = buildDateMarkers(
      [
        {
          id: "1",
          title: "A",
          eventDate: "2026-06-20",
          startTime: "18:00",
          endTime: "20:00",
          locationName: null,
          address: null,
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
          address: null,
          status: "OPEN",
          registeredParticipantCount: 1,
          registrationCount: 1,
        },
      ],
      parseDateTimeInTimezone("2026-06-20", "08:00")
    );

    expect(markers.get("2026-06-20")?.openCount).toBe(2);
  });

  it("counts ended open events as closed", () => {
    const markers = buildDateMarkers(
      [
        {
          id: "1",
          title: "A",
          eventDate: "2026-06-20",
          startTime: "18:00",
          endTime: "20:00",
          locationName: null,
          address: null,
          status: "OPEN",
          registeredParticipantCount: 1,
          registrationCount: 1,
        },
      ],
      parseDateTimeInTimezone("2026-06-20", "20:01")
    );

    expect(markers.get("2026-06-20")?.closedCount).toBe(1);
    expect(markers.get("2026-06-20")?.openCount).toBe(0);
  });
});

describe("isEventEnded", () => {
  it("returns false before end time on the same day", () => {
    const now = parseDateTimeInTimezone("2026-06-20", "19:59");
    expect(isEventEnded("2026-06-20", "20:00", now)).toBe(false);
  });

  it("returns true after end time on the same day", () => {
    const now = parseDateTimeInTimezone("2026-06-20", "20:01");
    expect(isEventEnded("2026-06-20", "20:00", now)).toBe(true);
  });
});

describe("getEventDisplayStatus", () => {
  it("shows CLOSED for ended open events", () => {
    const now = parseDateTimeInTimezone("2020-01-01", "21:00");
    expect(getEventDisplayStatus("OPEN", "2020-01-01", "20:00", now)).toBe("CLOSED");
  });

  it("shows OPEN before end time", () => {
    const now = parseDateTimeInTimezone("2099-12-31", "19:00");
    expect(getEventDisplayStatus("OPEN", "2099-12-31", "20:00", now)).toBe("OPEN");
  });

  it("shows CLOSED for cancelled events", () => {
    expect(getEventDisplayStatus("CANCELLED", "2099-12-31", "20:00")).toBe("CLOSED");
  });

  it("shows CLOSED for settled events", () => {
    expect(getEventDisplayStatus("COMPLETED", "2099-12-31", "20:00")).toBe("CLOSED");
  });
});

describe("getAdminEventDisplayStatus", () => {
  it("shows CLOSED for ended unsettled events", () => {
    const now = parseDateTimeInTimezone("2026-06-20", "20:01");
    expect(getAdminEventDisplayStatus("OPEN", "2026-06-20", "20:00", now)).toBe("CLOSED");
  });

  it("shows OPEN before end time", () => {
    const now = parseDateTimeInTimezone("2026-06-20", "19:59");
    expect(getAdminEventDisplayStatus("OPEN", "2026-06-20", "20:00", now)).toBe("OPEN");
  });

  it("shows COMPLETED for settled events", () => {
    expect(getAdminEventDisplayStatus("COMPLETED", "2020-01-01", "20:00")).toBe("COMPLETED");
  });
});

describe("isRegistrationOpen", () => {
  it("is false after end time", () => {
    const now = parseDateTimeInTimezone("2020-01-01", "21:00");
    expect(isRegistrationOpen("OPEN", "2020-01-01", "20:00", now)).toBe(false);
  });

  it("is true before end time", () => {
    const now = parseDateTimeInTimezone("2099-12-31", "19:00");
    expect(isRegistrationOpen("OPEN", "2099-12-31", "20:00", now)).toBe(true);
  });

  it("is false for completed events", () => {
    expect(isRegistrationOpen("COMPLETED", "2099-12-31", "20:00")).toBe(false);
  });
});

describe("calendar date markers", () => {
  it("marks settled events as closed on the user calendar", () => {
    const markers = buildDateMarkers([
      {
        id: "1",
        title: "A",
        eventDate: "2026-06-01",
        startTime: "18:00",
        endTime: "20:00",
        locationName: null,
        address: null,
        status: "COMPLETED",
        registeredParticipantCount: 1,
        registrationCount: 1,
      },
    ]);

    const marker = markers.get("2026-06-01")!;
    expect(isCalendarDateAvailable(marker)).toBe(false);
    expect(isCalendarDateClosed(marker)).toBe(true);
  });
});

describe("parseEventEnd", () => {
  it("parses date and time strings in app timezone", () => {
    const end = parseEventEnd("2026-06-20", "20:00");
    expect(end.toISOString()).toBe(parseDateTimeInTimezone("2026-06-20", "20:00").toISOString());
  });
});

describe("monthRange", () => {
  it("returns first and last day of month", () => {
    const { from, to } = monthRange(2026, 5);
    expect(from).toBe("2026-06-01");
    expect(to).toBe("2026-06-30");
  });
});
