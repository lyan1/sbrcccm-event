import { prisma } from "./db";
import { logAudit } from "./audit";
import type { MemberImportErrorCode, ParsedMemberImportLine } from "./csv";

export type MemberImportSkipReason = "MEMBER_EXISTS";

export type MemberImportRowOutcome =
  | { line: number; status: "created"; displayName: string; id: string; balanceCents: number }
  | { line: number; status: "skipped"; displayName: string; reason: MemberImportSkipReason }
  | {
      line: number;
      status: "error";
      reason: MemberImportErrorCode | "DUPLICATE_NAMES";
      displayName?: string;
    };

export async function importMembersFromParsedCsv(
  parsed: ParsedMemberImportLine[],
  adminId: string
): Promise<MemberImportRowOutcome[]> {
  const outcomes: MemberImportRowOutcome[] = [];

  for (const entry of parsed) {
    if (entry.kind === "error") {
      outcomes.push({
        line: entry.line,
        status: "error",
        reason: entry.reason,
        displayName: entry.displayName,
      });
      continue;
    }

    const matches = await prisma.memberAccount.findMany({
      where: { displayName: { equals: entry.displayName, mode: "insensitive" } },
      select: { id: true },
    });

    if (matches.length > 1) {
      outcomes.push({
        line: entry.line,
        status: "error",
        reason: "DUPLICATE_NAMES",
        displayName: entry.displayName,
      });
      continue;
    }

    if (matches.length === 1) {
      outcomes.push({
        line: entry.line,
        status: "skipped",
        displayName: entry.displayName,
        reason: "MEMBER_EXISTS",
      });
      continue;
    }

    const account = await prisma.memberAccount.create({
      data: {
        displayName: entry.displayName,
        balanceCents: entry.balanceCents,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "MEMBER_CREATED",
      entityType: "MemberAccount",
      entityId: account.id,
      newValue: account,
    });

    outcomes.push({
      line: entry.line,
      status: "created",
      displayName: account.displayName,
      id: account.id,
      balanceCents: account.balanceCents,
    });
  }

  return outcomes;
}
