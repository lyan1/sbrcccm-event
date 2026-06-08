import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { getMemberBalanceSummary } from "@/lib/queries/member-accounts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const range = req.nextUrl.searchParams.get("range") ?? "3m";
    const summary = await withDbRetry(() => getMemberBalanceSummary(id, range));

    if (!summary) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (error) {
    logDbError("GET /api/member-accounts/[id]/balance-summary failed", error);
    return NextResponse.json({ error: "Failed to load balance summary" }, { status: 500 });
  }
}
