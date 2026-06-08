import { RegistrationStatus } from "@prisma/client";
import { prisma } from "./db";
import { createTransaction } from "./transactions";
import { logAudit } from "./audit";

export interface SettlementItemInput {
  registrationId: string;
  actualParticipantCount: number;
  overrideDeductionCents?: number | null;
}

export interface SettlementPreviewItem {
  registrationId: string;
  memberAccountId: string;
  displayName: string;
  actualParticipantCount: number;
  calculatedDeductionCents: number;
  overrideDeductionCents: number | null;
  finalDeductionCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
}

export interface SettlementPreview {
  totalCostCents: number;
  totalActualParticipants: number;
  calculatedPerPersonCostCents: number;
  items: SettlementPreviewItem[];
  roundingDifferenceCents: number;
  hasOverrides: boolean;
}

export function calculateDeductions(
  totalCostCents: number,
  items: Array<{
    registrationId: string;
    memberAccountId: string;
    displayName: string;
    actualParticipantCount: number;
    balanceBeforeCents: number;
    overrideDeductionCents?: number | null;
  }>
): SettlementPreview {
  const totalActualParticipants = items.reduce(
    (sum, i) => sum + i.actualParticipantCount,
    0
  );

  if (totalActualParticipants <= 0) {
    throw new Error("Total actual participants must be greater than 0");
  }

  const basePerPerson = Math.floor(totalCostCents / totalActualParticipants);
  const remainder = totalCostCents - basePerPerson * totalActualParticipants;

  const sorted = [...items].sort((a, b) =>
    a.registrationId.localeCompare(b.registrationId)
  );

  const participantSlots: Array<{
    registrationId: string;
    memberAccountId: string;
    displayName: string;
    balanceBeforeCents: number;
    overrideDeductionCents?: number | null;
  }> = [];

  for (const item of sorted) {
    for (let i = 0; i < item.actualParticipantCount; i++) {
      participantSlots.push(item);
    }
  }

  const deductionMap = new Map<
    string,
    {
      registrationId: string;
      memberAccountId: string;
      displayName: string;
      actualParticipantCount: number;
      calculatedDeductionCents: number;
      overrideDeductionCents: number | null;
      balanceBeforeCents: number;
    }
  >();

  for (const item of sorted) {
    deductionMap.set(item.registrationId, {
      registrationId: item.registrationId,
      memberAccountId: item.memberAccountId,
      displayName: item.displayName,
      actualParticipantCount: item.actualParticipantCount,
      calculatedDeductionCents: 0,
      overrideDeductionCents: item.overrideDeductionCents ?? null,
      balanceBeforeCents: item.balanceBeforeCents,
    });
  }

  participantSlots.forEach((slot, index) => {
    const extra = index < remainder ? 1 : 0;
    const entry = deductionMap.get(slot.registrationId)!;
    entry.calculatedDeductionCents += basePerPerson + extra;
  });

  let hasOverrides = false;
  const previewItems: SettlementPreviewItem[] = [];

  for (const entry of deductionMap.values()) {
    const finalDeduction =
      entry.overrideDeductionCents ?? entry.calculatedDeductionCents;
    if (entry.overrideDeductionCents != null) hasOverrides = true;

    previewItems.push({
      registrationId: entry.registrationId,
      memberAccountId: entry.memberAccountId,
      displayName: entry.displayName,
      actualParticipantCount: entry.actualParticipantCount,
      calculatedDeductionCents: entry.calculatedDeductionCents,
      overrideDeductionCents: entry.overrideDeductionCents,
      finalDeductionCents: finalDeduction,
      balanceBeforeCents: entry.balanceBeforeCents,
      balanceAfterCents: entry.balanceBeforeCents - finalDeduction,
    });
  }

  return {
    totalCostCents,
    totalActualParticipants,
    calculatedPerPersonCostCents: basePerPerson,
    items: previewItems,
    roundingDifferenceCents: 0,
    hasOverrides,
  };
}

export async function buildSettlementPreview(
  eventId: string,
  totalCostCents: number,
  items: SettlementItemInput[]
): Promise<SettlementPreview> {
  const event = await prisma.pickleballEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      registrations: {
        include: { memberAccount: true },
      },
    },
  });

  if (event.status === "COMPLETED") {
    throw new Error("Event already settled");
  }

  const itemMap = new Map(items.map((i) => [i.registrationId, i]));

  const settlementItems = event.registrations.map((reg) => {
    const input = itemMap.get(reg.id);
    const actualCount =
      input?.actualParticipantCount ??
      (reg.status === RegistrationStatus.CANCELLED
        ? 0
        : reg.actualParticipantCount ??
          reg.registeredParticipantCount);

    return {
      registrationId: reg.id,
      memberAccountId: reg.memberAccountId,
      displayName: reg.memberAccount.displayName,
      actualParticipantCount: actualCount,
      balanceBeforeCents: reg.memberAccount.balanceCents,
      overrideDeductionCents: input?.overrideDeductionCents,
    };
  });

  return calculateDeductions(totalCostCents, settlementItems);
}

export async function confirmSettlement(
  eventId: string,
  totalCostCents: number,
  items: SettlementItemInput[],
  adminId: string
) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.pickleballEvent.findUniqueOrThrow({
      where: { id: eventId },
      include: {
        registrations: {
          include: { memberAccount: true },
        },
      },
    });

    if (event.status !== "OPEN" || event.settledAt) {
      throw new Error("Event already settled or not open");
    }

    const itemMap = new Map(items.map((i) => [i.registrationId, i]));

    const settlementItems = event.registrations.map((reg) => {
      const input = itemMap.get(reg.id);
      const actualCount =
        input?.actualParticipantCount ??
        (reg.status === RegistrationStatus.CANCELLED
          ? 0
          : reg.actualParticipantCount ??
            reg.registeredParticipantCount);

      return {
        registrationId: reg.id,
        memberAccountId: reg.memberAccountId,
        displayName: reg.memberAccount.displayName,
        actualParticipantCount: actualCount,
        balanceBeforeCents: reg.memberAccount.balanceCents,
        overrideDeductionCents: input?.overrideDeductionCents,
      };
    });

    const preview = calculateDeductions(totalCostCents, settlementItems);

    for (const item of preview.items) {
      await tx.eventRegistration.update({
        where: { id: item.registrationId },
        data: { actualParticipantCount: item.actualParticipantCount },
      });
    }

    for (const item of preview.items) {
      if (item.finalDeductionCents <= 0) continue;

      await createTransaction(
        {
          memberAccountId: item.memberAccountId,
          amountCents: -item.finalDeductionCents,
          type: "GAME_FEE",
          eventId,
          calculatedAmountCents: item.calculatedDeductionCents,
          finalAmountCents: item.finalDeductionCents,
          description: `Game fee for ${item.actualParticipantCount} participant(s)`,
          createdByAdminId: adminId,
        },
        tx
      );
    }

    await tx.pickleballEvent.update({
      where: { id: eventId },
      data: {
        status: "COMPLETED",
        totalCostCents: preview.totalCostCents,
        totalActualParticipants: preview.totalActualParticipants,
        calculatedPerPersonCostCents: preview.calculatedPerPersonCostCents,
        settledAt: new Date(),
        settledByAdminId: adminId,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "EVENT_SETTLED",
      entityType: "PickleballEvent",
      entityId: eventId,
      newValue: preview,
    });

    return preview;
  });
}

export async function fetchActiveMemberBalances() {
  return prisma.memberAccount.findMany({
    where: { isActive: true },
    select: {
      id: true,
      displayName: true,
      balanceCents: true,
      phone: true,
      email: true,
      isActive: true,
    },
    orderBy: { displayName: "asc" },
  });
}

export async function confirmSettlementWithSnapshot(
  eventId: string,
  totalCostCents: number,
  items: SettlementItemInput[],
  adminId: string
) {
  const preview = await confirmSettlement(eventId, totalCostCents, items, adminId);

  const [event, accounts] = await Promise.all([
    prisma.pickleballEvent.findUniqueOrThrow({
      where: { id: eventId },
      select: { id: true, eventDate: true, settledAt: true },
    }),
    fetchActiveMemberBalances(),
  ]);

  await prisma.balanceSnapshot.create({
    data: {
      eventId,
      generatedByAdminId: adminId,
      accountCount: accounts.length,
    },
  });

  return { preview, event, accounts };
}
