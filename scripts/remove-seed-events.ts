import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_EVENT_IDS = ["seed-event-1", "seed-event-2"];

async function main() {
  const deleted = {
    transactions: 0,
    registrations: 0,
    balanceSnapshots: 0,
    events: 0,
  };

  const txResult = await prisma.transaction.deleteMany({
    where: { eventId: { in: SEED_EVENT_IDS } },
  });
  deleted.transactions = txResult.count;

  const regResult = await prisma.eventRegistration.deleteMany({
    where: { eventId: { in: SEED_EVENT_IDS } },
  });
  deleted.registrations = regResult.count;

  const snapResult = await prisma.balanceSnapshot.deleteMany({
    where: { eventId: { in: SEED_EVENT_IDS } },
  });
  deleted.balanceSnapshots = snapResult.count;

  const eventResult = await prisma.pickleballEvent.deleteMany({
    where: { id: { in: SEED_EVENT_IDS } },
  });
  deleted.events = eventResult.count;

  console.log("Removed seed events (Jun 6 & Jun 8):");
  console.log(`  ${deleted.events} events`);
  console.log(`  ${deleted.registrations} registrations`);
  console.log(`  ${deleted.transactions} transactions`);
  console.log(`  ${deleted.balanceSnapshots} balance snapshots`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
