import { Prisma } from "@prisma/client";
import { prisma } from "./db";

type TxClient = Prisma.TransactionClient;

export type MemberWithFamily = {
  id: string;
  displayName: string;
  balanceCents: number;
  familyId: string | null;
  family: { id: string; displayName: string; balanceCents: number; isActive: boolean } | null;
};

export function walletKey(member: { id: string; familyId: string | null }): string {
  return member.familyId ?? `solo:${member.id}`;
}

export function effectiveBalanceCents(member: MemberWithFamily): number {
  return member.family ? member.family.balanceCents : member.balanceCents;
}

export async function loadMemberWithFamily(
  memberAccountId: string,
  client: TxClient = prisma
): Promise<MemberWithFamily | null> {
  return client.memberAccount.findUnique({
    where: { id: memberAccountId },
    select: {
      id: true,
      displayName: true,
      balanceCents: true,
      familyId: true,
      family: {
        select: {
          id: true,
          displayName: true,
          balanceCents: true,
          isActive: true,
        },
      },
    },
  });
}

export async function fetchActiveBalanceUnits() {
  const [families, soloMembers] = await Promise.all([
    prisma.family.findMany({
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
    }),
    prisma.memberAccount.findMany({
      where: { isActive: true, familyId: null },
      select: {
        id: true,
        displayName: true,
        balanceCents: true,
        phone: true,
        email: true,
        isActive: true,
      },
      orderBy: { displayName: "asc" },
    }),
  ]);

  return { families, soloMembers };
}

export async function fetchNegativeBalanceUnits() {
  const { families, soloMembers } = await fetchActiveBalanceUnits();
  const negativeFamilies = families.filter((f) => f.balanceCents < 0);
  const negativeSolo = soloMembers.filter((m) => m.balanceCents < 0);
  return { negativeFamilies, negativeSolo };
}

export function balanceUnitsForSnapshot(params: {
  families: Array<{
    id: string;
    displayName: string;
    balanceCents: number;
    phone: string | null;
    email: string | null;
    isActive: boolean;
  }>;
  soloMembers: Array<{
    id: string;
    displayName: string;
    balanceCents: number;
    phone: string | null;
    email: string | null;
    isActive: boolean;
  }>;
}) {
  return [...params.families, ...params.soloMembers];
}

export async function searchFamilies(query?: string) {
  const q = query?.trim();
  return prisma.family.findMany({
    where: {
      isActive: true,
      ...(q ? { displayName: { contains: q, mode: "insensitive" as const } } : {}),
    },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
    take: 20,
  });
}

export async function mergeSoloBalanceIntoFamily(
  memberAccountId: string,
  familyId: string,
  client: TxClient = prisma
) {
  const member = await client.memberAccount.findUniqueOrThrow({
    where: { id: memberAccountId },
    select: { balanceCents: true, familyId: true },
  });

  if (member.familyId || member.balanceCents === 0) {
    return;
  }

  await client.family.update({
    where: { id: familyId },
    data: { balanceCents: { increment: member.balanceCents } },
  });

  await client.memberAccount.update({
    where: { id: memberAccountId },
    data: { balanceCents: 0 },
  });
}
