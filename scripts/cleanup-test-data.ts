import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_FAMILY_IDS = ["seed-zhang-family", "seed-chen-family"];
const SEED_EVENT_IDS = ["seed-event-1", "seed-event-2"];

function isSeedMemberId(id: string) {
  return (
    id === "seed-li-si" ||
    id.startsWith("seed-zhang-family-") ||
    id.startsWith("seed-chen-family-")
  );
}

async function main() {
  const allMembers = await prisma.memberAccount.findMany({ select: { id: true, displayName: true } });
  const testMemberIds = allMembers.filter((m) => !isSeedMemberId(m.id)).map((m) => m.id);

  const allFamilies = await prisma.family.findMany({ select: { id: true, displayName: true } });
  const testFamilyIds = allFamilies.filter((f) => !SEED_FAMILY_IDS.includes(f.id)).map((f) => f.id);

  const allEvents = await prisma.pickleballEvent.findMany({ select: { id: true, title: true } });
  const testEventIds = allEvents.filter((e) => !SEED_EVENT_IDS.includes(e.id)).map((e) => e.id);

  const deleted = {
    transactions: 0,
    registrations: 0,
    balanceSnapshots: 0,
    members: 0,
    families: 0,
    events: 0,
    locations: 0,
  };

  if (testMemberIds.length > 0 || testFamilyIds.length > 0 || testEventIds.length > 0) {
    const txResult = await prisma.transaction.deleteMany({
      where: {
        OR: [
          { memberAccountId: { in: testMemberIds } },
          { familyId: { in: testFamilyIds } },
          { eventId: { in: testEventIds } },
        ],
      },
    });
    deleted.transactions = txResult.count;
  }

  if (testMemberIds.length > 0 || testEventIds.length > 0) {
    const regResult = await prisma.eventRegistration.deleteMany({
      where: {
        OR: [
          { memberAccountId: { in: testMemberIds } },
          { eventId: { in: testEventIds } },
        ],
      },
    });
    deleted.registrations = regResult.count;
  }

  if (testEventIds.length > 0) {
    const snapResult = await prisma.balanceSnapshot.deleteMany({
      where: { eventId: { in: testEventIds } },
    });
    deleted.balanceSnapshots = snapResult.count;
  }

  if (testMemberIds.length > 0) {
    const memberResult = await prisma.memberAccount.deleteMany({
      where: { id: { in: testMemberIds } },
    });
    deleted.members = memberResult.count;
  }

  if (testFamilyIds.length > 0) {
    const familyResult = await prisma.family.deleteMany({
      where: { id: { in: testFamilyIds } },
    });
    deleted.families = familyResult.count;
  }

  if (testEventIds.length > 0) {
    const eventResult = await prisma.pickleballEvent.deleteMany({
      where: { id: { in: testEventIds } },
    });
    deleted.events = eventResult.count;
  }

  const locResult = await prisma.eventLocation.deleteMany({
    where: { name: { in: ["E2E Court"] } },
  });
  deleted.locations = locResult.count;

  await prisma.family.updateMany({
    where: { id: { in: SEED_FAMILY_IDS } },
    data: { balanceCents: 0 },
  });

  await prisma.memberAccount.update({
    where: { id: "seed-li-si" },
    data: { balanceCents: 5000, familyId: null },
  });

  await prisma.pickleballEvent.updateMany({
    where: { id: { in: SEED_EVENT_IDS } },
    data: {
      status: "OPEN",
      settledAt: null,
      settledByAdminId: null,
      totalCostCents: null,
      totalActualParticipants: null,
      calculatedPerPersonCostCents: null,
    },
  });

  console.log("Cleanup summary:");
  console.log(`  Removed ${deleted.members} test members`);
  console.log(`  Removed ${deleted.families} test families`);
  console.log(`  Removed ${deleted.events} test events`);
  console.log(`  Removed ${deleted.registrations} registrations`);
  console.log(`  Removed ${deleted.transactions} transactions`);
  console.log(`  Removed ${deleted.balanceSnapshots} balance snapshots`);
  console.log(`  Removed ${deleted.locations} unused test locations`);
  console.log("Seed families, members, and events restored to defaults.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
