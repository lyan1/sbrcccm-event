import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_FAMILY_IDS = ["seed-zhang-family", "seed-chen-family"];

const SEED_MEMBER_IDS = [
  "seed-li-si",
  "seed-zhang-family-张三",
  "seed-zhang-family-张太太",
  "seed-chen-family-john-chen",
  "seed-chen-family-mary-chen",
];

async function main() {
  const deleted = {
    transactions: 0,
    registrations: 0,
    members: 0,
    families: 0,
  };

  const txResult = await prisma.transaction.deleteMany({
    where: {
      OR: [
        { memberAccountId: { in: SEED_MEMBER_IDS } },
        { familyId: { in: SEED_FAMILY_IDS } },
      ],
    },
  });
  deleted.transactions = txResult.count;

  const regResult = await prisma.eventRegistration.deleteMany({
    where: { memberAccountId: { in: SEED_MEMBER_IDS } },
  });
  deleted.registrations = regResult.count;

  const memberResult = await prisma.memberAccount.deleteMany({
    where: { id: { in: SEED_MEMBER_IDS } },
  });
  deleted.members = memberResult.count;

  const familyResult = await prisma.family.deleteMany({
    where: { id: { in: SEED_FAMILY_IDS } },
  });
  deleted.families = familyResult.count;

  console.log("Removed seed families and members:");
  console.log(`  ${deleted.families} families`);
  console.log(`  ${deleted.members} members`);
  console.log(`  ${deleted.registrations} registrations`);
  console.log(`  ${deleted.transactions} transactions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
