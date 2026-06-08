import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { getMemberBalance } from "@/lib/queries/member-accounts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const balance = await withDbRetry(() => getMemberBalance(id));

    if (!balance) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(balance);
  } catch (error) {
    logDbError("GET /api/member-accounts/[id]/balance failed", error);
    return NextResponse.json({ error: "Failed to load balance" }, { status: 500 });
  }
}
