import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash },
  });

  console.log(`Admin user: ${admin.username}`);

  const members = [
    { id: "seed-zhang-family", displayName: "张三家庭", phone: "555-0101", email: "zhang@example.com" },
    { id: "seed-chen-family", displayName: "John and Mary Chen", phone: "555-0102" },
    { id: "seed-li-si", displayName: "李四", balanceCents: 5000 },
  ];

  for (const m of members) {
    await prisma.memberAccount.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        displayName: m.displayName,
        phone: m.phone,
        email: m.email,
        balanceCents: m.balanceCents ?? 0,
      },
    });
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const startTime = new Date(tomorrow);
  startTime.setHours(18, 0, 0, 0);
  const endTime = new Date(tomorrow);
  endTime.setHours(20, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const startTime2 = new Date(dayAfter);
  startTime2.setHours(9, 0, 0, 0);
  const endTime2 = new Date(dayAfter);
  endTime2.setHours(11, 0, 0, 0);

  await prisma.pickleballEvent.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      title: "Pickleball",
      eventDate: tomorrow,
      startTime,
      endTime,
      locationName: "Community Gym",
      address: "123 Church St",
      status: "OPEN",
    },
  });

  await prisma.pickleballEvent.upsert({
    where: { id: "seed-event-2" },
    update: {},
    create: {
      id: "seed-event-2",
      title: "Pickleball",
      eventDate: dayAfter,
      startTime: startTime2,
      endTime: endTime2,
      locationName: "Park Courts",
      status: "OPEN",
    },
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
