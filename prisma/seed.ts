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

  await prisma.siteContentBlock.upsert({
    where: { key: "PICKLEBALL_PURPOSE" },
    update: {},
    create: {
      key: "PICKLEBALL_PURPOSE",
      contentZh:
        "匹克球是南贝城基督教会华语部的联谊活动，欢迎弟兄姊妹和朋友一起运动、交流。报名前请先加入微信群，便于接收活动通知与变更信息。",
      contentEn:
        "Pickleball is a fellowship activity of the South Baton Rouge Church of Christ Chinese Ministry. Brothers, sisters, and friends are welcome to exercise and connect together. Please join the WeChat group before registering so you can receive event updates.",
    },
  });

  await prisma.siteContentBlock.upsert({
    where: { key: "USAGE_INSTRUCTIONS" },
    update: {},
    create: {
      key: "USAGE_INSTRUCTIONS",
      contentZh:
        "1. 在「添加新名字」中创建或选择您的姓名/家庭账户。\n2. 在日历上点击可报名日期，查看活动详情并提交报名。\n3. 在「我的报名」中查看或取消报名；在「余额」中查看账户余额。\n4. 活动费用结算后，请通过「付款信息」页面使用 Zelle 或 Venmo 付款。",
      contentEn:
        '1. Use "Add New Name" to create or select your name/family account.\n2. Tap an available date on the calendar to view event details and register.\n3. Use "My Registrations" to view or cancel registrations; check your balance on the Balance page.\n4. After event fees are settled, pay via Zelle or Venmo on the Payment Info page.',
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
