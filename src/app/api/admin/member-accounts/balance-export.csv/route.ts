import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { fetchActiveMemberBalances } from "@/lib/settlement";
import { buildBalanceSnapshotCsv, balanceSnapshotFilename } from "@/lib/csv";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await fetchActiveMemberBalances();
  const now = new Date();

  const csv = buildBalanceSnapshotCsv({
    snapshotTimestamp: now,
    eventId: null,
    eventDate: null,
    accounts,
  });

  const filename = balanceSnapshotFilename(null, now);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
