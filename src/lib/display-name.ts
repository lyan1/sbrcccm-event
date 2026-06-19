import { Prisma } from "@prisma/client";
import { prisma } from "./db";

type TxClient = Prisma.TransactionClient;

export class MemberDisplayNameTakenError extends Error {
  constructor() {
    super("MEMBER_DISPLAY_NAME_TAKEN");
    this.name = "MemberDisplayNameTakenError";
  }
}

export class FamilyDisplayNameTakenError extends Error {
  constructor() {
    super("FAMILY_DISPLAY_NAME_TAKEN");
    this.name = "FamilyDisplayNameTakenError";
  }
}

export function normalizeDisplayName(name: string): string {
  return name.trim();
}

export async function findMemberByDisplayName(
  displayName: string,
  excludeId?: string,
  client: TxClient = prisma
) {
  const normalized = normalizeDisplayName(displayName);
  if (!normalized) return null;

  return client.memberAccount.findFirst({
    where: {
      displayName: { equals: normalized, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, displayName: true },
  });
}

export async function findFamilyByDisplayName(
  displayName: string,
  excludeId?: string,
  client: TxClient = prisma
) {
  const normalized = normalizeDisplayName(displayName);
  if (!normalized) return null;

  return client.family.findFirst({
    where: {
      displayName: { equals: normalized, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, displayName: true },
  });
}

export async function assertMemberDisplayNameAvailable(
  displayName: string,
  excludeId?: string,
  client: TxClient = prisma
) {
  const existing = await findMemberByDisplayName(displayName, excludeId, client);
  if (existing) {
    throw new MemberDisplayNameTakenError();
  }
}

export async function assertFamilyDisplayNameAvailable(
  displayName: string,
  excludeId?: string,
  client: TxClient = prisma
) {
  const existing = await findFamilyByDisplayName(displayName, excludeId, client);
  if (existing) {
    throw new FamilyDisplayNameTakenError();
  }
}

export function isDisplayNameConflict(error: unknown): error is MemberDisplayNameTakenError | FamilyDisplayNameTakenError {
  return (
    error instanceof MemberDisplayNameTakenError || error instanceof FamilyDisplayNameTakenError
  );
}
