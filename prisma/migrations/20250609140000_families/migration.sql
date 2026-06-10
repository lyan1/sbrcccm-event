-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MemberAccount" ADD COLUMN "familyId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "familyId" TEXT;

-- CreateIndex
CREATE INDEX "Family_displayName_idx" ON "Family"("displayName");

-- CreateIndex
CREATE INDEX "Family_isActive_idx" ON "Family"("isActive");

-- CreateIndex
CREATE INDEX "MemberAccount_familyId_idx" ON "MemberAccount"("familyId");

-- CreateIndex
CREATE INDEX "Transaction_familyId_idx" ON "Transaction"("familyId");

-- AddForeignKey
ALTER TABLE "MemberAccount" ADD CONSTRAINT "MemberAccount_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
