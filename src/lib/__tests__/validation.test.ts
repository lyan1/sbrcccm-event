import { describe, expect, it } from "vitest";
import { createEventSchema, eventLocationSchema } from "../validation";

describe("createEventSchema", () => {
  const validEvent = {
    eventDate: "2026-06-20",
    startTime: "18:00",
    endTime: "20:00",
    locationName: "Community Gym",
    address: "123 Church St",
  };

  it("requires location and address", () => {
    const missingLocation = createEventSchema.safeParse({
      ...validEvent,
      locationName: "",
    });
    expect(missingLocation.success).toBe(false);

    const missingAddress = createEventSchema.safeParse({
      ...validEvent,
      address: "",
    });
    expect(missingAddress.success).toBe(false);
  });

  it("accepts valid event with location and address", () => {
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });
});

describe("eventLocationSchema", () => {
  it("requires name and address", () => {
    expect(eventLocationSchema.safeParse({ name: "", address: "123 Main" }).success).toBe(false);
    expect(eventLocationSchema.safeParse({ name: "Gym", address: "" }).success).toBe(false);
    expect(eventLocationSchema.safeParse({ name: "Gym", address: "123 Main" }).success).toBe(true);
  });
});
