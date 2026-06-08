import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { settlementSchema } from "@/lib/validation";
import { confirmSettlementWithSnapshot } from "@/lib/settlement";
import { buildBalanceSnapshotCsv, balanceSnapshotFilename } from "@/lib/csv";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = settlementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { preview, event, accounts } = await confirmSettlementWithSnapshot(
      id,
      parsed.data.totalCostCents,
      parsed.data.items,
      session.adminId
    );

    const now = new Date();
    const csv = buildBalanceSnapshotCsv({
      snapshotTimestamp: now,
      eventId: event.id,
      eventDate: event.eventDate,
      accounts,
    });

    const filename = balanceSnapshotFilename(event.eventDate, now);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Settlement-Preview": JSON.stringify({
          totalCostCents: preview.totalCostCents,
          totalActualParticipants: preview.totalActualParticipants,
        }),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Settlement failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
