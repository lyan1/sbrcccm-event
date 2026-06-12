import {
  PaymentMethod,
  Prisma,
  TransactionType,
} from "@prisma/client";
import { logDbError, prisma, withDbRetry } from "./db";
import { logAudit } from "./audit";
import { loadMemberWithFamily } from "./family-balance";

type TxClient = Prisma.TransactionClient;

export async function createTransaction(
  params: {
    memberAccountId: string;
    amountCents: number;
    type: TransactionType;
    eventId?: string;
    paymentMethod?: PaymentMethod;
    calculatedAmountCents?: number;
    finalAmountCents?: number;
    description?: string;
    createdByAdminId?: string;
  },
  client: TxClient = prisma
) {
  const member = await loadMemberWithFamily(params.memberAccountId, client);
  if (!member) {
    throw new Error("Member account not found");
  }

  let newBalance: number;
  let familyId: string | null = null;

  if (member.family) {
    newBalance = member.family.balanceCents + params.amountCents;
    familyId = member.family.id;
    await client.family.update({
      where: { id: member.family.id },
      data: { balanceCents: newBalance },
    });
  } else {
    newBalance = member.balanceCents + params.amountCents;
    await client.memberAccount.update({
      where: { id: params.memberAccountId },
      data: { balanceCents: newBalance },
    });
  }

  const transaction = await client.transaction.create({
    data: {
      memberAccountId: params.memberAccountId,
      familyId,
      amountCents: params.amountCents,
      balanceAfterCents: newBalance,
      type: params.type,
      eventId: params.eventId,
      paymentMethod: params.paymentMethod,
      calculatedAmountCents: params.calculatedAmountCents,
      finalAmountCents: params.finalAmountCents,
      description: params.description,
      createdByAdminId: params.createdByAdminId,
    },
  });

  return { transaction, newBalance };
}

export async function addPayment(
  memberAccountId: string,
  amountCents: number,
  paymentMethod: PaymentMethod,
  description: string | undefined,
  adminId: string
) {
  const result = await withDbRetry(() =>
    prisma.$transaction(async (tx) =>
      createTransaction(
        {
          memberAccountId,
          amountCents,
          type: "PAYMENT",
          paymentMethod,
          description,
          createdByAdminId: adminId,
        },
        tx
      )
    )
  );

  try {
    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "PAYMENT_ADDED",
      entityType: "Transaction",
      entityId: result.transaction.id,
      newValue: result.transaction,
    });
  } catch (error) {
    logDbError("PAYMENT_ADDED audit failed", error);
  }

  return result;
}

export async function addAdjustment(
  memberAccountId: string,
  amountCents: number,
  description: string,
  adminId: string
) {
  const result = await withDbRetry(() =>
    prisma.$transaction(async (tx) =>
      createTransaction(
        {
          memberAccountId,
          amountCents,
          type: "MANUAL_ADJUSTMENT",
          description,
          createdByAdminId: adminId,
        },
        tx
      )
    )
  );

  try {
    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "ADJUSTMENT_ADDED",
      entityType: "Transaction",
      entityId: result.transaction.id,
      newValue: result.transaction,
    });
  } catch (error) {
    logDbError("ADJUSTMENT_ADDED audit failed", error);
  }

  return result;
}
