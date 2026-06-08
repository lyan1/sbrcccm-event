import { describe, expect, it } from "vitest";
import {
  APP_TIMEZONE,
  formatEventDateKey,
  formatEventTimeKey,
  parseDateTimeInTimezone,
} from "../timezone";

describe("formatEventTimeKey", () => {
  it("formats stored UTC time in app timezone", () => {
    // 18:00 CDT on 2026-06-20 is 23:00 UTC
    const stored = new Date("2026-06-20T23:00:00.000Z");
    expect(formatEventTimeKey(stored, APP_TIMEZONE)).toBe("18:00");
  });
});

describe("formatEventDateKey", () => {
  it("formats date in app timezone", () => {
    const stored = new Date("2026-06-20T05:00:00.000Z");
    expect(formatEventDateKey(stored, APP_TIMEZONE)).toBe("2026-06-20");
  });
});

describe("parseDateTimeInTimezone", () => {
  it("round-trips wall-clock times in app timezone", () => {
    const parsed = parseDateTimeInTimezone("2026-06-20", "18:00", APP_TIMEZONE);
    expect(formatEventTimeKey(parsed, APP_TIMEZONE)).toBe("18:00");
    expect(formatEventDateKey(parsed, APP_TIMEZONE)).toBe("2026-06-20");
  });
});
