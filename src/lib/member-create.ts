import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  assertFamilyDisplayNameAvailable,
  assertMemberDisplayNameAvailable,
  normalizeDisplayName,
} from "./display-name";
import { mergeSoloBalanceIntoFamily } from "./family-balance";

type TxClient = Prisma.TransactionClient;

export type CreateMemberInput = {
  displayName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  familyId?: string | null;
  newFamilyDisplayName?: string | null;
};

export async function createMemberAccount(
  input: CreateMemberInput,
  client: TxClient = prisma
) {
  const displayName = normalizeDisplayName(input.displayName);
  await assertMemberDisplayNameAvailable(displayName, undefined, client);

  let familyId = input.familyId ?? null;

  if (input.newFamilyDisplayName?.trim()) {
    const familyDisplayName = normalizeDisplayName(input.newFamilyDisplayName);
    await assertFamilyDisplayNameAvailable(familyDisplayName, undefined, client);

    const family = await client.family.create({
      data: {
        displayName: familyDisplayName,
        phone: input.phone || null,
        email: input.email || null,
      },
    });
    familyId = family.id;
  }

  if (familyId) {
    const family = await client.family.findUniqueOrThrow({ where: { id: familyId } });
    if (!family.isActive) {
      throw new Error("FAMILY_INACTIVE");
    }
  }

  const account = await client.memberAccount.create({
    data: {
      displayName,
      phone: input.phone || null,
      email: input.email || null,
      notes: input.notes || null,
      balanceCents: familyId ? 0 : 0,
      familyId,
    },
    include: {
      family: { select: { id: true, displayName: true, balanceCents: true, isActive: true } },
    },
  });

  return account;
}

export async function assignMemberToFamily(
  memberAccountId: string,
  familyId: string | null,
  client: TxClient = prisma
) {
  if (familyId) {
    const family = await client.family.findUniqueOrThrow({ where: { id: familyId } });
    if (!family.isActive) {
      throw new Error("FAMILY_INACTIVE");
    }
    await mergeSoloBalanceIntoFamily(memberAccountId, familyId, client);
  }

  return client.memberAccount.update({
    where: { id: memberAccountId },
    data: { familyId },
    include: {
      family: { select: { id: true, displayName: true, balanceCents: true, isActive: true } },
    },
  });
}
