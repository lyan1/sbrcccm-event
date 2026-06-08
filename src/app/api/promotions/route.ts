import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { filterVisiblePromotionalCards } from "@/lib/promotions";

export async function GET() {
  try {
    const cards = await prisma.promotionalCard.findMany();
    const visible = filterVisiblePromotionalCards(cards);

    return NextResponse.json(
      visible.map((c) => ({
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
      }))
    );
  } catch (error) {
    console.error("GET /api/promotions failed:", error);
    return NextResponse.json({ error: "Failed to load promotions" }, { status: 500 });
  }
}
