-- CreateTable
CREATE TABLE "PromotionalCard" (
    "id" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL,
    "titleEn" TEXT,
    "descriptionZh" TEXT,
    "descriptionEn" TEXT,
    "imageUrl" TEXT,
    "storagePath" TEXT,
    "linkUrl" TEXT,
    "linkLabelZh" TEXT,
    "linkLabelEn" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionalCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "generatedByAdminId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountCount" INTEGER NOT NULL,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionalCard_isVisible_idx" ON "PromotionalCard"("isVisible");
CREATE INDEX "PromotionalCard_displayOrder_idx" ON "PromotionalCard"("displayOrder");
CREATE INDEX "PromotionalCard_startsAt_idx" ON "PromotionalCard"("startsAt");
CREATE INDEX "PromotionalCard_endsAt_idx" ON "PromotionalCard"("endsAt");
CREATE INDEX "BalanceSnapshot_eventId_idx" ON "BalanceSnapshot"("eventId");
CREATE INDEX "BalanceSnapshot_generatedAt_idx" ON "BalanceSnapshot"("generatedAt");

-- AddForeignKey
ALTER TABLE "PromotionalCard" ADD CONSTRAINT "PromotionalCard_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PickleballEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_generatedByAdminId_fkey" FOREIGN KEY ("generatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
