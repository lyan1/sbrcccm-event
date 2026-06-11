import { RegistrationStatus } from "@prisma/client";
import { prisma } from "./db";
import { createTransaction } from "./transactions";
import { logAudit } from "./audit";
import {
  balanceUnitsForSnapshot,
  effectiveBalanceCents,
  fetchActiveBalanceUnits,
  walletKey,
} from "./family-balance";

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

function applySequentialWalletBalances(
  items: SettlementPreviewItem[],
  walletKeys: Map<string, string>,
  walletStartBalances: Map<string, number>
): SettlementPreviewItem[] {
  const running = new Map(walletStartBalances);
  const sorted = [...items].sort((a, b) => a.registrationId.localeCompare(b.registrationId));

  return sorted.map((item) => {
    const key = walletKeys.get(item.registrationId)!;
    const before = running.get(key) ?? 0;
    const after = before - item.finalDeductionCents;
    running.set(key, after);
    return { ...item, balanceBeforeCents: before, balanceAfterCents: after };
  });
}

export function calculateDeductions(
  totalCostCents: number,
  items: Array<{
    registrationId: string;
    memberAccountId: string;
    displayName: string;
    actualParticipantCount: number;
    balanceBeforeCents: number;
    walletKey: string;
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

  const walletKeys = new Map(
    items.map((item) => [item.registrationId, item.walletKey])
  );
  const walletStartBalances = new Map<string, number>();
  for (const item of items) {
    if (!walletStartBalances.has(item.walletKey)) {
      walletStartBalances.set(item.walletKey, item.balanceBeforeCents);
    }
  }

  let hasOverrides = false;
  const rawPreviewItems: SettlementPreviewItem[] = [];

  for (const entry of deductionMap.values()) {
    const finalDeduction =
      entry.overrideDeductionCents ?? entry.calculatedDeductionCents;
    if (entry.overrideDeductionCents != null) hasOverrides = true;

    rawPreviewItems.push({
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

  const previewItems = applySequentialWalletBalances(
    rawPreviewItems,
    walletKeys,
    walletStartBalances
  );

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
        include: {
          memberAccount: {
            include: { family: true },
          },
        },
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
    const member = reg.memberAccount;

    return {
      registrationId: reg.id,
      memberAccountId: reg.memberAccountId,
      displayName: member.displayName,
      actualParticipantCount: actualCount,
      balanceBeforeCents: effectiveBalanceCents(member),
      walletKey: walletKey(member),
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
          include: {
            memberAccount: {
              include: { family: true },
            },
          },
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
      const member = reg.memberAccount;

      return {
        registrationId: reg.id,
        memberAccountId: reg.memberAccountId,
        displayName: member.displayName,
        actualParticipantCount: actualCount,
        balanceBeforeCents: effectiveBalanceCents(member),
        walletKey: walletKey(member),
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

export async function reopenSettlement(eventId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.pickleballEvent.findUniqueOrThrow({
      where: { id: eventId },
      select: { id: true, title: true, status: true },
    });

    if (event.status !== "COMPLETED") {
      throw new Error("Only settled events can be reopened");
    }

    const gameFees = await tx.transaction.findMany({
      where: { eventId, type: "GAME_FEE" },
      orderBy: { createdAt: "asc" },
    });

    for (const fee of gameFees) {
      const reversalMarker = `[reversal:${fee.id}]`;
      const existingReversal = await tx.transaction.findFirst({
        where: {
          eventId,
          type: "REVERSAL",
          description: { contains: reversalMarker },
        },
      });
      if (existingReversal) continue;

      const refundCents = -fee.amountCents;
      if (refundCents === 0) continue;

      await createTransaction(
        {
          memberAccountId: fee.memberAccountId,
          amountCents: refundCents,
          type: "REVERSAL",
          eventId,
          calculatedAmountCents: fee.calculatedAmountCents ?? undefined,
          finalAmountCents: fee.finalAmountCents ?? undefined,
          description: `Settlement correction – fee refunded (${event.title}) ${reversalMarker}`,
          createdByAdminId: adminId,
        },
        tx
      );
    }

    await tx.pickleballEvent.update({
      where: { id: eventId },
      data: {
        status: "OPEN",
        settledAt: null,
        settledByAdminId: null,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "EVENT_SETTLEMENT_REOPENED",
      entityType: "PickleballEvent",
      entityId: eventId,
    });

    return event;
  });
}

export async function fetchActiveMemberBalances() {
  const units = await fetchActiveBalanceUnits();
  return balanceUnitsForSnapshot(units);
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
