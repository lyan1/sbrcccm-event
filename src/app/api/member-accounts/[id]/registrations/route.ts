import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import {
  getMemberRegistrations,
  splitRegistrationsByScope,
} from "@/lib/queries/member-accounts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scope = req.nextUrl.searchParams.get("scope") ?? "all";

    if (scope === "split") {
      const all = await withDbRetry(() => getMemberRegistrations(id, "all"));
      const { upcoming, past } = splitRegistrationsByScope(all);
      return NextResponse.json({ upcoming, past });
    }

    const registrations = await withDbRetry(() => getMemberRegistrations(id, scope));
    return NextResponse.json(registrations);
  } catch (error) {
    logDbError("GET /api/member-accounts/[id]/registrations failed", error);
    return NextResponse.json({ error: "Failed to load registrations" }, { status: 500 });
  }
}
