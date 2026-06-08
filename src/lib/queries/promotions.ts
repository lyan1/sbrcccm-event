import { prisma } from "@/lib/db";
import { filterVisiblePromotionalCards } from "@/lib/promotions";

export async function getPublicPromotions() {
  const cards = await prisma.promotionalCard.findMany();
  const visible = filterVisiblePromotionalCards(cards);

  return visible.map((c) => ({
    id: c.id,
    titleZh: c.titleZh,
    titleEn: c.titleEn,
    descriptionZh: c.descriptionZh,
    descriptionEn: c.descriptionEn,
    imageUrl: c.imageUrl,
    linkUrl: c.linkUrl,
    linkLabelZh: c.linkLabelZh,
    linkLabelEn: c.linkLabelEn,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    displayOrder: c.displayOrder,
  }));
}
