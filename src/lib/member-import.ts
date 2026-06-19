import { prisma } from "./db";
import { logAudit } from "./audit";
import { findFamilyByDisplayName, findMemberByDisplayName } from "./display-name";
import { createMemberAccount } from "./member-create";
import type { MemberImportErrorCode, ParsedMemberImportLine } from "./csv";

export type MemberImportSkipReason = "MEMBER_EXISTS" | "FAMILY_EXISTS";

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

    const familyMatch = await findFamilyByDisplayName(entry.displayName);

    if (familyMatch) {
      outcomes.push({
        line: entry.line,
        status: "skipped",
        displayName: entry.displayName,
        reason: "FAMILY_EXISTS",
      });
      continue;
    }

    const memberMatch = await findMemberByDisplayName(entry.displayName);

    if (memberMatch) {
      outcomes.push({
        line: entry.line,
        status: "skipped",
        displayName: entry.displayName,
        reason: "MEMBER_EXISTS",
      });
      continue;
    }

    const family = await prisma.family.create({
      data: {
        displayName: entry.displayName,
        balanceCents: entry.balanceCents,
      },
    });

    const account = await createMemberAccount({
      displayName: entry.displayName,
      familyId: family.id,
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "MEMBER_CREATED",
      entityType: "MemberAccount",
      entityId: account.id,
      newValue: { ...account, importedFamilyId: family.id },
    });

    outcomes.push({
      line: entry.line,
      status: "created",
      displayName: account.displayName,
      id: account.id,
      balanceCents: family.balanceCents,
    });
  }

  return outcomes;
}
