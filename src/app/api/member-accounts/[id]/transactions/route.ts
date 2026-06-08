import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { getMemberTransactions } from "@/lib/queries/member-accounts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const range = req.nextUrl.searchParams.get("range") ?? "3m";
    const transactions = await withDbRetry(() => getMemberTransactions(id, range));
    return NextResponse.json(transactions);
  } catch (error) {
    logDbError("GET /api/member-accounts/[id]/transactions failed", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
