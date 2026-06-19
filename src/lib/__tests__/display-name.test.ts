import { describe, expect, it } from "vitest";
import {
  FamilyDisplayNameTakenError,
  MemberDisplayNameTakenError,
  isDisplayNameConflict,
  normalizeDisplayName,
} from "../display-name";

describe("normalizeDisplayName", () => {
  it("trims whitespace", () => {
    expect(normalizeDisplayName("  Alice  ")).toBe("Alice");
  });
});

describe("isDisplayNameConflict", () => {
  it("detects member name conflicts", () => {
    expect(isDisplayNameConflict(new MemberDisplayNameTakenError())).toBe(true);
  });

  it("detects family name conflicts", () => {
    expect(isDisplayNameConflict(new FamilyDisplayNameTakenError())).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isDisplayNameConflict(new Error("nope"))).toBe(false);
  });
});
