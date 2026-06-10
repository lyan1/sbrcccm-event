import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const allMembers = await prisma.memberAccount.findMany({ select: { id: true, displayName: true } });
  const testMemberIds = allMembers.map((m) => m.id);

  const allFamilies = await prisma.family.findMany({ select: { id: true, displayName: true } });
  const testFamilyIds = allFamilies.map((f) => f.id);

  const allEvents = await prisma.pickleballEvent.findMany({ select: { id: true, title: true } });
  const testEventIds = allEvents.map((e) => e.id);

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

  console.log("Cleanup summary:");
  console.log(`  Removed ${deleted.members} test members`);
  console.log(`  Removed ${deleted.families} test families`);
  console.log(`  Removed ${deleted.events} test events`);
  console.log(`  Removed ${deleted.registrations} registrations`);
  console.log(`  Removed ${deleted.transactions} transactions`);
  console.log(`  Removed ${deleted.balanceSnapshots} balance snapshots`);
  console.log(`  Removed ${deleted.locations} unused test locations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
