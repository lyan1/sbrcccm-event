import { describe, expect, it } from "vitest";
import { filterVisiblePromotionalCards } from "../promotions";
import type { PromotionalCard } from "@prisma/client";

const base = (overrides: Partial<PromotionalCard>): PromotionalCard => ({
  id: "1",
  titleZh: "活动",
  titleEn: null,
  descriptionZh: null,
  descriptionEn: null,
  imageUrl: null,
  storagePath: null,
  linkUrl: null,
  linkLabelZh: null,
  linkLabelEn: null,
  startsAt: null,
  endsAt: null,
  isVisible: true,
  displayOrder: 0,
  createdByAdminId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("filterVisiblePromotionalCards", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("hides invisible cards", () => {
    const result = filterVisiblePromotionalCards(
      [base({ isVisible: false })],
      now
    );
    expect(result).toHaveLength(0);
  });

  it("hides future cards", () => {
    const result = filterVisiblePromotionalCards(
      [base({ startsAt: new Date("2026-07-01") })],
      now
    );
    expect(result).toHaveLength(0);
  });

  it("hides expired cards", () => {
    const result = filterVisiblePromotionalCards(
      [base({ endsAt: new Date("2026-06-01") })],
      now
    );
    expect(result).toHaveLength(0);
  });

  it("respects display order", () => {
    const result = filterVisiblePromotionalCards(
      [
        base({ id: "b", titleZh: "B", displayOrder: 2 }),
        base({ id: "a", titleZh: "A", displayOrder: 1 }),
      ],
      now
    );
    expect(result[0].titleZh).toBe("A");
  });
});
