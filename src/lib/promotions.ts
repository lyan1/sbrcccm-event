import { PromotionalCard } from "@prisma/client";

export function filterVisiblePromotionalCards(
  cards: PromotionalCard[],
  now = new Date(),
  limit = 6
) {
  return cards
    .filter((card) => {
      if (!card.isVisible) return false;
      if (card.startsAt && card.startsAt > now) return false;
      if (card.endsAt && card.endsAt < now) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit);
}
