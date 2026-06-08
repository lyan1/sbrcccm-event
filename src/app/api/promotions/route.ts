import { NextResponse } from "next/server";
import { logDbError } from "@/lib/db";
import { getPublicPromotions } from "@/lib/queries/promotions";

export async function GET() {
  try {
    const promotions = await getPublicPromotions();
    return NextResponse.json(promotions);
  } catch (error) {
    logDbError("GET /api/promotions failed", error);
    return NextResponse.json({ error: "Failed to load promotions" }, { status: 500 });
  }
}
