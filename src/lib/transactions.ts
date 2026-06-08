import {
  PaymentMethod,
  Prisma,
  TransactionType,
} from "@prisma/client";
import { prisma } from "./db";
import { logAudit } from "./audit";

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
  const account = await client.memberAccount.findUniqueOrThrow({
    where: { id: params.memberAccountId },
  });

  const newBalance = account.balanceCents + params.amountCents;

  const transaction = await client.transaction.create({
    data: {
      memberAccountId: params.memberAccountId,
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

  await client.memberAccount.update({
    where: { id: params.memberAccountId },
    data: { balanceCents: newBalance },
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
  return prisma.$transaction(async (tx) => {
    const result = await createTransaction(
      {
        memberAccountId,
        amountCents,
        type: "PAYMENT",
        paymentMethod,
        description,
        createdByAdminId: adminId,
      },
      tx
    );

    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "PAYMENT_ADDED",
      entityType: "Transaction",
      entityId: result.transaction.id,
      newValue: result.transaction,
    });

    return result;
  });
}

export async function addAdjustment(
  memberAccountId: string,
  amountCents: number,
  description: string,
  adminId: string
) {
  return prisma.$transaction(async (tx) => {
    const result = await createTransaction(
      {
        memberAccountId,
        amountCents,
        type: "MANUAL_ADJUSTMENT",
        description,
        createdByAdminId: adminId,
      },
      tx
    );

    await logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      action: "ADJUSTMENT_ADDED",
      entityType: "Transaction",
      entityId: result.transaction.id,
      newValue: result.transaction,
    });

    return result;
  });
}
