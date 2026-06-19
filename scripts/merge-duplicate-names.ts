import { Prisma, PrismaClient } from "@prisma/client";
import { mergeSoloBalanceIntoFamily } from "../src/lib/family-balance";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

type Tx = Prisma.TransactionClient;

function groupByLowerName<T extends { displayName: string }>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.displayName.trim().toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

function pickKeeper<T extends { createdAt: Date }>(rows: T[], score: (row: T) => number): T {
  return [...rows].sort((a, b) => {
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

async function mergeFamilyGroup(
  tx: Tx,
  keeperId: string,
  duplicateId: string,
  log: (message: string) => void
) {
  const duplicate = await tx.family.findUniqueOrThrow({
    where: { id: duplicateId },
    include: { members: { select: { id: true } } },
  });

  for (const member of duplicate.members) {
    await mergeSoloBalanceIntoFamily(member.id, keeperId, tx);
    await tx.memberAccount.update({
      where: { id: member.id },
      data: { familyId: keeperId },
    });
  }

  if (duplicate.balanceCents !== 0) {
    await tx.family.update({
      where: { id: keeperId },
      data: { balanceCents: { increment: duplicate.balanceCents } },
    });
  }

  await tx.transaction.updateMany({
    where: { familyId: duplicateId },
    data: { familyId: keeperId },
  });

  await tx.family.delete({ where: { id: duplicateId } });
  log(`  merged family ${duplicateId} -> ${keeperId} (${duplicate.displayName})`);
}

async function mergeMemberGroup(
  tx: Tx,
  keeperId: string,
  duplicateId: string,
  log: (message: string) => void
) {
  const [keeper, duplicate] = await Promise.all([
    tx.memberAccount.findUniqueOrThrow({ where: { id: keeperId } }),
    tx.memberAccount.findUniqueOrThrow({ where: { id: duplicateId } }),
  ]);

  const duplicateRegs = await tx.eventRegistration.findMany({
    where: { memberAccountId: duplicateId },
  });

  for (const reg of duplicateRegs) {
    const existing = await tx.eventRegistration.findUnique({
      where: {
        eventId_memberAccountId: {
          eventId: reg.eventId,
          memberAccountId: keeperId,
        },
      },
    });

    if (existing) {
      const actualParticipantCount =
        existing.actualParticipantCount == null && reg.actualParticipantCount == null
          ? null
          : (existing.actualParticipantCount ?? 0) + (reg.actualParticipantCount ?? 0);

      await tx.eventRegistration.update({
        where: { id: existing.id },
        data: {
          registeredParticipantCount:
            existing.registeredParticipantCount + reg.registeredParticipantCount,
          actualParticipantCount,
        },
      });
      await tx.eventRegistration.delete({ where: { id: reg.id } });
    } else {
      await tx.eventRegistration.update({
        where: { id: reg.id },
        data: { memberAccountId: keeperId },
      });
    }
  }

  await tx.transaction.updateMany({
    where: { memberAccountId: duplicateId },
    data: { memberAccountId: keeperId },
  });

  if (!duplicate.familyId && duplicate.balanceCents !== 0) {
    if (keeper.familyId) {
      await tx.family.update({
        where: { id: keeper.familyId },
        data: { balanceCents: { increment: duplicate.balanceCents } },
      });
    } else {
      await tx.memberAccount.update({
        where: { id: keeperId },
        data: { balanceCents: { increment: duplicate.balanceCents } },
      });
    }
  }

  await tx.memberAccount.delete({ where: { id: duplicateId } });
  log(`  merged member ${duplicateId} -> ${keeperId} (${duplicate.displayName})`);
}

async function planFamilyMerges() {
  const families = await prisma.family.findMany({
    include: {
      _count: { select: { members: true, transactions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const plans: Array<{ keeperId: string; duplicateId: string; displayName: string }> = [];

  for (const [, group] of groupByLowerName(families)) {
    if (group.length < 2) continue;

    const keeper = pickKeeper(group, (f) => f._count.members + f._count.transactions);
    for (const duplicate of group) {
      if (duplicate.id === keeper.id) continue;
      plans.push({
        keeperId: keeper.id,
        duplicateId: duplicate.id,
        displayName: duplicate.displayName,
      });
    }
  }

  return plans;
}

async function planMemberMerges() {
  const members = await prisma.memberAccount.findMany({
    include: {
      _count: { select: { registrations: true, transactions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const plans: Array<{ keeperId: string; duplicateId: string; displayName: string }> = [];

  for (const [, group] of groupByLowerName(members)) {
    if (group.length < 2) continue;

    const keeper = pickKeeper(group, (m) => m._count.registrations + m._count.transactions);
    for (const duplicate of group) {
      if (duplicate.id === keeper.id) continue;
      plans.push({
        keeperId: keeper.id,
        duplicateId: duplicate.id,
        displayName: duplicate.displayName,
      });
    }
  }

  return plans;
}

async function main() {
  const familyPlans = await planFamilyMerges();
  const memberPlans = await planMemberMerges();

  console.log(`Duplicate families to merge: ${familyPlans.length}`);
  for (const plan of familyPlans) {
    console.log(`  ${plan.displayName}: ${plan.duplicateId} -> ${plan.keeperId}`);
  }

  console.log(`Duplicate members to merge: ${memberPlans.length}`);
  for (const plan of memberPlans) {
    console.log(`  ${plan.displayName}: ${plan.duplicateId} -> ${plan.keeperId}`);
  }

  if (!apply) {
    if (familyPlans.length === 0 && memberPlans.length === 0) {
      console.log("No duplicate display names found.");
    } else {
      console.log("\nDry run only. Re-run with --apply to merge.");
    }
    return;
  }

  if (familyPlans.length === 0 && memberPlans.length === 0) {
    console.log("No duplicate display names found.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const plan of familyPlans) {
      await mergeFamilyGroup(tx, plan.keeperId, plan.duplicateId, console.log);
    }
    for (const plan of memberPlans) {
      await mergeMemberGroup(tx, plan.keeperId, plan.duplicateId, console.log);
    }
  });

  console.log("Merge complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
