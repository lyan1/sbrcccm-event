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
        "1. 在「添加新名字」中创建您的姓名，并选择加入现有家庭或创建新家庭。\n2. 在日历上点击可报名日期，查看活动详情并提交报名。\n3. 在「我的报名」中查看或取消报名；在「余额」中查看家庭共享余额。\n4. 活动费用结算后，请通过「付款信息」页面使用 Zelle 或 Venmo 付款。",
      contentEn:
        '1. Use "Add New Name" to create your name and join an existing family or create a new one.\n2. Tap an available date on the calendar to view event details and register.\n3. Use "My Registrations" to view or cancel registrations; check your shared family balance on the Balance page.\n4. After event fees are settled, pay via Zelle or Venmo on the Payment Info page.',
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
