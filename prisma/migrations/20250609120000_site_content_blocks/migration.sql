-- CreateEnum
CREATE TYPE "SiteContentKey" AS ENUM ('PICKLEBALL_PURPOSE', 'USAGE_INSTRUCTIONS');

-- CreateTable
CREATE TABLE "SiteContentBlock" (
    "key" "SiteContentKey" NOT NULL,
    "contentZh" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContentBlock_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "SiteContentBlock" ADD CONSTRAINT "SiteContentBlock_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default home page content
INSERT INTO "SiteContentBlock" ("key", "contentZh", "contentEn", "updatedAt")
VALUES
(
    'PICKLEBALL_PURPOSE',
    '匹克球是南贝城基督教会华语部的联谊活动，欢迎弟兄姊妹和朋友一起运动、交流。报名前请先加入微信群，便于接收活动通知与变更信息。',
    'Pickleball is a fellowship activity of the South Baton Rouge Church of Christ Chinese Ministry. Brothers, sisters, and friends are welcome to exercise and connect together. Please join the WeChat group before registering so you can receive event updates.',
    CURRENT_TIMESTAMP
),
(
    'USAGE_INSTRUCTIONS',
    E'1. 在「添加新名字」中创建或选择您的姓名/家庭账户。\n2. 在日历上点击可报名日期，查看活动详情并提交报名。\n3. 在「我的报名」中查看或取消报名；在「余额」中查看账户余额。\n4. 活动费用结算后，请通过「付款信息」页面使用 Zelle 或 Venmo 付款。',
    E'1. Use "Add New Name" to create or select your name/family account.\n2. Tap an available date on the calendar to view event details and register.\n3. Use "My Registrations" to view or cancel registrations; check your balance on the Balance page.\n4. After event fees are settled, pay via Zelle or Venmo on the Payment Info page.',
    CURRENT_TIMESTAMP
);
