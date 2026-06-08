import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const images = await prisma.appImage.findMany({
    where: { isVisible: true },
    orderBy: { type: "asc" },
    select: {
      type: true,
      title: true,
      description: true,
      imageUrl: true,
    },
  });

  return NextResponse.json(images);
}
